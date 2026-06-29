/**
 * Import OUR/registrar final exam schedules into Supabase for a CRS term_id.
 *
 * Workflow:
 *   Edit data/final-exams-{termId}.json (see data/final-exams-sample.json)
 *   DATABASE_URL=… bun run import:final-exams -- --term-id 1252 --replace
 *
 * Flags:
 *   --from-json path   Import from a specific JSON file
 *   --dry-run          Parse + map only; no DB writes
 *   --no-replace       Do not delete existing rows for the term before insert
 */

import { config } from "dotenv";
import { existsSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { finalExamsTable, roomsTable, updateTable } from "@drizzle/schema";
import {
  defaultFinalExamsExportPath,
  extractFinalExamRows,
  normalizeFacilityKey,
  normalizeFinalExamRow,
  type FinalExamExportPayload,
} from "@lib/final-exams/normalize";

config({ path: ".env" });

type CliOptions = {
  termId: number;
  dryRun: boolean;
  replace: boolean;
  fromJson: string | null;
};

function parseArgs(argv: string[]): CliOptions {
  let termId = 1252;
  let dryRun = false;
  let replace = true;
  let fromJson: string | null = null;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--term-id") {
      termId = Number(argv[++i]);
    } else if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg === "--no-replace") {
      replace = false;
    } else if (arg === "--replace") {
      replace = true;
    } else if (arg === "--from-json") {
      fromJson = argv[++i] ?? null;
    }
  }

  if (!Number.isFinite(termId)) {
    throw new Error("Invalid --term-id");
  }

  return { termId, dryRun, replace, fromJson };
}

function loadExport(path: string, expectedTermId: number) {
  const payload = JSON.parse(
    readFileSync(path, "utf8"),
  ) as FinalExamExportPayload;
  if (payload.term_id != null && payload.term_id !== expectedTermId) {
    throw new Error(
      `Export ${path} is for term_id=${payload.term_id}, but --term-id ${expectedTermId} was requested.`,
    );
  }
  const source = payload.source?.trim();
  if (!source) {
    throw new Error(`${path} must include a non-empty "source" field.`);
  }
  const rows = extractFinalExamRows(payload);
  if (rows.length === 0) {
    throw new Error(`${path} did not contain any exam rows.`);
  }
  return { source, rows };
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

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const exportPath =
    options.fromJson ?? defaultFinalExamsExportPath(options.termId);

  if (!existsSync(exportPath)) {
    throw new Error(
      `No local export at ${exportPath}. Copy data/final-exams-sample.json and edit for your term.`,
    );
  }

  const { source, rows: rawRows } = loadExport(exportPath, options.termId);
  const normalized = rawRows
    .map((row) => normalizeFinalExamRow(row))
    .filter((row): row is NonNullable<typeof row> => row !== null);

  if (normalized.length === 0) {
    console.error("No rows could be normalized — inspect the local export.");
    process.exit(1);
  }

  if (options.dryRun) {
    console.log(
      `Dry run: ${normalized.length} normalized rows from ${source}.`,
    );
    console.log("Sample:", normalized[0]);
    return;
  }

  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    console.error("DATABASE_URL is required unless --dry-run");
    process.exit(1);
  }

  const pool = new pg.Pool({ connectionString });
  const db = drizzle(pool);

  try {
    const rooms = await db
      .select({ id: roomsTable.id, code: roomsTable.roomCode })
      .from(roomsTable);
    const roomIdByKey = new Map<string, number>();
    for (const room of rooms) {
      roomIdByKey.set(normalizeFacilityKey(room.code), room.id);
    }

    const unmatched = new Map<string, number>();
    const inserts: (typeof finalExamsTable.$inferInsert)[] = [];

    for (const row of normalized) {
      let roomId: number | null = null;
      const facility = row.facilityCode?.trim();
      if (facility) {
        roomId = roomIdByKey.get(normalizeFacilityKey(facility)) ?? null;
        if (roomId == null) {
          unmatched.set(facility, (unmatched.get(facility) ?? 0) + 1);
        }
      }

      inserts.push({
        termId: options.termId,
        courseCode: row.courseCode,
        section: row.section,
        courseTitle: row.courseTitle,
        roomId,
        examDate: row.examDate,
        startsAt: row.startsAt,
        endsAt: row.endsAt,
        source,
      });
    }

    if (options.replace) {
      await db.transaction(async (tx) => {
        await tx
          .delete(finalExamsTable)
          .where(eq(finalExamsTable.termId, options.termId));

        const batchSize = 500;
        for (let i = 0; i < inserts.length; i += batchSize) {
          await tx
            .insert(finalExamsTable)
            .values(inserts.slice(i, i + batchSize));
        }

        await refreshSyncKey(tx, "final_exams");
      });
      console.log(
        `Cleared and re-imported term_id=${options.termId} (${inserts.length} rows, transactional).`,
      );
    } else {
      const batchSize = 500;
      for (let i = 0; i < inserts.length; i += batchSize) {
        await db
          .insert(finalExamsTable)
          .values(inserts.slice(i, i + batchSize));
      }
      await refreshSyncKey(db, "final_exams");
      console.log(
        `Imported ${inserts.length} final exams for term_id=${options.termId}.`,
      );
    }

    if (unmatched.size > 0) {
      console.warn(
        `Imported ${[...unmatched.values()].reduce((a, b) => a + b, 0)} rows with unmatched room codes (room_id left null):`,
      );
      for (const [facility, count] of [...unmatched.entries()].sort(
        (a, b) => b[1] - a[1],
      )) {
        console.warn(`  ${count}× ${facility}`);
      }
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
