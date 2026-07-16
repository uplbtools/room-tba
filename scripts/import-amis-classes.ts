/**
 * Import AMIS class schedules into Supabase for a given CRS term_id.
 *
 * Workflow (fetch once, reuse local cache):
 *   AMIS_BEARER_TOKEN=… AMIS_SESSION_ID=… bun run import:amis-classes -- --term-id 1253 --fetch
 *   DATABASE_URL=… bun run import:amis-classes -- --term-id 1252
 *
 * AMIS bearer tokens expire in about an hour — paste a fresh token for --fetch only.
 * Flags:
 *   --fetch            Fetch from AMIS, strip instructor PII, save JSON, then import
 *   --from-json path   Import from saved JSON only (no AMIS call)
 *   --scrub-exports    Re-sanitize all data/amis-*.json in place (no AMIS / DB)
 *   --dry-run          Parse + map only; no DB writes
 *   --replace-term     Remove term rows not present in the new export (COM stale sections)
 *   --no-replace       Legacy alias; upsert without stale removal (default)
 *
 * Default import upserts by natural key (term + course + section + type).
 * See docs/amis-com-refresh-runbook.md and docs/amis-contingency-runbook.md.
 *
 * CRS term_id is chronological within the AY: 1251 = 1st sem, 1252 = 2nd sem, 1253 = midyear.
 * LEC/LAB/RCT/CPT rows are imported even when the room is unresolved; roomId stays null so the planner still sees the section.
 * Thesis, special problem, dissertation, practicum, and independent study import with roomId null when AMIS has no facility.
 * Local exports live at data/amis-*-{termId}.json (gitignored).
 * AMIS responses include instructor names — never commit raw exports or store names.
 */

import { config } from "dotenv";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { dirname } from "node:path";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import {
  aliasesTable,
  classesTable,
  roomsTable,
  termsTable,
  updateTable,
} from "@drizzle/schema";
import { fetchAmisClasses } from "@lib/amis/fetch-classes";
import { defaultAmisExportPath } from "@lib/amis/export-path";
import {
  buildRoomLookup,
  classNaturalKey,
  formatImportReport,
  resolveImportRows,
  summarizeImportChanges,
} from "@lib/amis/import-classes";
import {
  extractClassRows,
  normalizeAmisClass,
} from "@lib/amis/normalize-class";
import {
  amisExportContainsInstructorPii,
  sanitizeAmisRows,
} from "@lib/amis/sanitize-row";
import {
  amisImportExitCode,
  AmisImportError,
  operatorHintForCode,
} from "@lib/amis/import-errors";
import type { AmisClassRow } from "@lib/amis/types";

config({ path: ".env" });

type CliOptions = {
  termId: number;
  dryRun: boolean;
  replaceTerm: boolean;
  fetch: boolean;
  fromJson: string | null;
  scrubExports: boolean;
};

function parseArgs(argv: string[]): CliOptions {
  let termId = 1253;
  let dryRun = false;
  let replaceTerm = false;
  let fetch = false;
  let fromJson: string | null = null;
  let scrubExports = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--term-id") {
      termId = Number(argv[++i]);
    } else if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg === "--replace-term" || arg === "--replace") {
      replaceTerm = true;
    } else if (arg === "--no-replace") {
      replaceTerm = false;
    } else if (arg === "--fetch") {
      fetch = true;
    } else if (arg === "--from-json") {
      fromJson = argv[++i] ?? null;
    } else if (arg === "--scrub-exports") {
      scrubExports = true;
    }
  }

  if (!Number.isFinite(termId)) {
    throw new Error("Invalid --term-id");
  }

  return { termId, dryRun, replaceTerm, fetch, fromJson, scrubExports };
}

function saveSanitizedExport(
  termId: number,
  rows: ReturnType<typeof sanitizeAmisRows>,
  path: string,
) {
  const payload = { term_id: termId, classes: rows };
  if (amisExportContainsInstructorPii(payload)) {
    throw new Error(
      `Refusing to save ${path}: instructor PII still present after sanitization.`,
    );
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(payload, null, 2));
}

function loadSanitizedExport(path: string, expectedTermId: number) {
  const payload = JSON.parse(readFileSync(path, "utf8")) as {
    term_id?: number;
    classes?: unknown;
  };
  if (payload.term_id != null && payload.term_id !== expectedTermId) {
    throw new Error(
      `Export ${path} is for term_id=${payload.term_id}, but --term-id ${expectedTermId} was requested.`,
    );
  }
  if (amisExportContainsInstructorPii(payload)) {
    throw new Error(
      `${path} still contains instructor PII. Run with --scrub-exports or re-fetch with --fetch.`,
    );
  }
  const rows = sanitizeAmisRows(extractClassRows(payload));
  if (rows.length === 0) {
    throw new AmisImportError(
      "SCHEMA_MISMATCH",
      `${path} did not contain any class rows.`,
    );
  }
  return rows;
}

async function refreshSyncKey(
  db: Pick<ReturnType<typeof drizzle>, "update">,
  tableName: string,
) {
  await db
    .update(updateTable)
    .set({ syncKey: randomUUID() })
    .where(eq(updateTable.tableName, tableName));
}

function inferTermIdFromPayload(
  payload: unknown,
  rows: AmisClassRow[],
): number {
  const envelope = payload as { term_id?: number; termId?: number };
  if (Number.isFinite(envelope.term_id)) return Number(envelope.term_id);
  if (Number.isFinite(envelope.termId)) return Number(envelope.termId);
  for (const row of rows) {
    const termId = Number(row["term_id"] ?? row["termId"]);
    if (Number.isFinite(termId) && termId > 0) return termId;
  }
  return 0;
}

function scrubAllExports() {
  const files = readdirSync("data").filter(
    (name) => name.startsWith("amis-") && name.endsWith(".json"),
  );
  if (files.length === 0) {
    console.log("No data/amis-*.json files to scrub.");
    return;
  }
  for (const name of files) {
    const path = `data/${name}`;
    const payload = JSON.parse(readFileSync(path, "utf8"));
    const rows = sanitizeAmisRows(extractClassRows(payload));
    if (rows.length === 0) {
      console.warn(
        `Skipping ${path}: extractClassRows() found 0 class rows (refusing to overwrite with empty classes).`,
      );
      continue;
    }
    const termId = inferTermIdFromPayload(payload, rows);
    saveSanitizedExport(termId, rows, path);
    console.log(`Scrubbed instructor PII from ${path} (${rows.length} rows).`);
  }
}

async function resolveRawRows(options: CliOptions) {
  const exportPath = options.fromJson ?? defaultAmisExportPath(options.termId);

  if (options.fetch) {
    const bearerToken = process.env.AMIS_BEARER_TOKEN?.trim();
    if (!bearerToken) {
      throw new AmisImportError(
        "AUTH_EXPIRED",
        "AMIS_BEARER_TOKEN is required for --fetch",
      );
    }
    console.log(`Fetching AMIS classes for term_id=${options.termId}…`);
    const fetched = await fetchAmisClasses({
      termId: options.termId,
      bearerToken,
      sessionId: process.env.AMIS_SESSION_ID?.trim(),
    });
    console.log(`Fetched ${fetched.length} raw rows from AMIS.`);
    const sanitized = sanitizeAmisRows(fetched);
    saveSanitizedExport(options.termId, sanitized, exportPath);
    console.log(
      `Saved sanitized export to ${exportPath} (instructor names stripped).`,
    );
    return sanitized;
  }

  if (options.fromJson || existsSync(exportPath)) {
    const path = options.fromJson ?? exportPath;
    console.log(`Loading classes from ${path}…`);
    const rows = loadSanitizedExport(path, options.termId);
    console.log(`Loaded ${rows.length} sanitized rows from cache.`);
    return rows;
  }

  throw new AmisImportError(
    "MISSING_EXPORT",
    `No local export at ${exportPath}. Run once with --fetch to download from AMIS and save JSON.`,
  );
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.fetch && process.env.CI === "true") {
    console.error(
      "Refusing AMIS --fetch in CI (token expiry and manual ops only). Use cached JSON or unit tests.",
    );
    process.exit(amisImportExitCode("CI_FETCH_BLOCKED"));
  }

  if (options.scrubExports) {
    scrubAllExports();
    return;
  }

  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString && !options.dryRun) {
    console.error("DATABASE_URL is required unless --dry-run");
    process.exit(amisImportExitCode("MISSING_DATABASE_URL"));
  }

  const rawRows = await resolveRawRows(options);

  const normalized = rawRows
    .map((row) => normalizeAmisClass(row, options.termId))
    .filter((row): row is NonNullable<typeof row> => row !== null);

  if (normalized.length === 0) {
    console.error("No rows could be normalized — inspect the local export.");
    process.exit(amisImportExitCode("NO_NORMALIZED_ROWS"));
  }

  if (options.dryRun) {
    console.log(`Dry run: ${normalized.length} normalized rows.`);
    console.log("Sample:", normalized[0]);
    return;
  }

  const pool = new pg.Pool({ connectionString });
  const db = drizzle(pool);

  try {
    const [rooms, roomAliases, existingClasses] = await Promise.all([
      db
        .select({ id: roomsTable.id, code: roomsTable.roomCode })
        .from(roomsTable),
      db
        .select({
          alias: aliasesTable.alias,
          targetId: aliasesTable.targetId,
        })
        .from(aliasesTable)
        .where(eq(aliasesTable.targetType, "room")),
      db
        .select({
          id: classesTable.id,
          courseCode: classesTable.courseCode,
          section: classesTable.section,
          type: classesTable.type,
          courseTitle: classesTable.courseTitle,
          schedule: classesTable.schedule,
          roomId: classesTable.roomId,
          termId: classesTable.termId,
        })
        .from(classesTable)
        .where(eq(classesTable.termId, options.termId)),
    ]);

    const roomLookup = buildRoomLookup(rooms, roomAliases);

    const {
      rows: incomingRows,
      stats,
      unmatched,
    } = resolveImportRows(normalized, roomLookup);

    const existingByKey = new Map<string, (typeof existingClasses)[number]>();
    for (const row of existingClasses) {
      if (row.termId == null) continue;
      existingByKey.set(
        classNaturalKey({
          termId: row.termId,
          courseCode: row.courseCode ?? "",
          section: row.section,
          type: row.type,
        }),
        row,
      );
    }

    const { summary, inserts, updates, removeIds } = summarizeImportChanges({
      replaceTerm: options.replaceTerm,
      existingKeys: new Set(existingByKey.keys()),
      existingByKey,
      incomingRows,
    });

    await db.transaction(async (tx) => {
      if (removeIds.length > 0) {
        for (const id of removeIds) {
          await tx.delete(classesTable).where(eq(classesTable.id, id));
        }
      }

      for (const { id, row } of updates) {
        await tx
          .update(classesTable)
          .set({
            courseCode: row.courseCode,
            section: row.section,
            type: row.type,
            courseTitle: row.courseTitle,
            schedule: row.schedule,
            roomId: row.roomId,
            termId: row.termId,
          })
          .where(eq(classesTable.id, id));
      }

      const batchSize = 500;
      for (let i = 0; i < inserts.length; i += batchSize) {
        await tx.insert(classesTable).values(inserts.slice(i, i + batchSize));
      }

      await refreshSyncKey(tx, "classes");
      await tx
        .update(termsTable)
        .set({ classesImportedAt: new Date().toISOString() })
        .where(eq(termsTable.id, options.termId));
    });

    console.log(
      formatImportReport({
        termId: options.termId,
        rawCount: rawRows.length,
        normalizedCount: normalized.length,
        stats,
        summary,
        unmatched,
      }),
    );
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  if (error instanceof AmisImportError) {
    console.error(`${error.code}: ${error.message}`);
    console.error(`Operator: ${operatorHintForCode(error.code)}`);
    process.exit(amisImportExitCode(error.code));
  }
  console.error(error instanceof Error ? error.message : error);
  process.exit(amisImportExitCode("UNKNOWN"));
});
