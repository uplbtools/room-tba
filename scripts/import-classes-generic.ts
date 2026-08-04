/**
 * Import class schedules from a flat, registrar-agnostic CSV or JSON export.
 * The upstream campus keeps its own adapter (scripts/import-amis-classes.ts);
 * this is the one a fork points at whatever its registrar produces. Shape +
 * walkthrough: docs/fork-data-guide.md. Worked example:
 * data/sample-campus/classes.csv.
 *
 * Usage:
 *   bun run import:classes-generic -- path/to/classes.csv
 *   bun run import:classes-generic -- path/to/classes.json --dry-run
 *
 * Flags:
 *   --dry-run        Parse + validate only; no DB access needed
 *   --replace-term   Also delete DB rows (for terms present in the file) that
 *                    the file no longer contains
 *
 * Upserts by natural key (term + course + section + type), exactly like the
 * upstream importer, so re-running the same file is a no-op. Rows whose room
 * does not match any rooms.room_code or room alias import with roomId null.
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import {
  aliasesTable,
  classesTable,
  roomsTable,
  termsTable,
  updateTable,
} from "@drizzle/schema";
import {
  buildRoomLookup,
  type ClassInsertRow,
  classNaturalKey,
  matchRoomId,
  summarizeImportChanges,
} from "@lib/amis/import-classes";
import {
  formatRowIssues,
  type NormalizedGenericClass,
  normalizeGenericClasses,
  parseGenericClassesFile,
  validateGenericClassEntries,
} from "@lib/generic-class-import";
import { loadEnv } from "./load-env";

loadEnv();

function parseArgs(argv: string[]) {
  const flags = new Set(argv.filter((arg) => arg.startsWith("--")));
  const file = argv.find((arg) => !arg.startsWith("--"));
  if (!file) {
    console.error(
      "Usage: bun run import:classes-generic -- <file.csv|file.json> [--dry-run] [--replace-term]",
    );
    process.exit(1);
  }
  const kind = file.endsWith(".json")
    ? ("json" as const)
    : file.endsWith(".csv")
      ? ("csv" as const)
      : null;
  if (!kind) {
    console.error(`Unsupported file type: ${file} (expected .csv or .json)`);
    process.exit(1);
  }
  return {
    file,
    kind,
    dryRun: flags.has("--dry-run"),
    replaceTerm: flags.has("--replace-term"),
  };
}

type RoomResolution = {
  rows: ClassInsertRow[];
  matched: { direct: number; alias: number; fuzzy: number };
  roomless: number;
  unmatched: Map<string, number>;
};

function resolveRooms(
  classes: NormalizedGenericClass[],
  lookup: ReturnType<typeof buildRoomLookup>,
): RoomResolution {
  const matched = { direct: 0, alias: 0, fuzzy: 0 };
  const unmatched = new Map<string, number>();
  let roomless = 0;

  const rows = classes.map((row) => {
    let roomId: number | null = null;
    for (const candidate of row.roomCandidates) {
      const match = matchRoomId(lookup, candidate);
      if (match) {
        roomId = match.roomId;
        matched[match.kind] += 1;
        break;
      }
    }
    if (roomId === null) {
      if (row.roomCandidates.length === 0) {
        roomless += 1;
      } else {
        const label = row.roomCandidates[0];
        unmatched.set(label, (unmatched.get(label) ?? 0) + 1);
      }
    }
    return {
      courseCode: row.courseCode,
      section: row.section,
      type: row.type,
      courseTitle: row.courseTitle,
      schedule: row.schedule,
      roomId,
      termId: row.termId,
      acadGroup: row.acadGroup,
      acadOrg: row.acadOrg,
    };
  });

  return { rows, matched, roomless, unmatched };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  const entries = parseGenericClassesFile(
    readFileSync(options.file, "utf8"),
    options.kind,
  );
  const issues = validateGenericClassEntries(entries);
  if (issues.length > 0) {
    console.error(`${options.file} has ${issues.length} invalid value(s):`);
    console.error(formatRowIssues(issues));
    process.exit(1);
  }
  const classes = normalizeGenericClasses(entries);
  if (classes.length === 0) {
    console.error(`${options.file} contains no class rows.`);
    process.exit(1);
  }
  const termIds = [...new Set(classes.map((row) => row.termId))].sort(
    (a, b) => a - b,
  );

  if (options.dryRun) {
    console.log(
      `Dry run: ${entries.length} row(s) → ${classes.length} section(s) across term(s) ${termIds.join(", ")}.`,
    );
    console.log("Sample:", classes[0]);
    return;
  }

  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    console.error("DATABASE_URL is required (or use --dry-run)");
    process.exit(1);
  }

  const pool = new pg.Pool({ connectionString });
  const db = drizzle(pool);

  try {
    const knownTerms = await db
      .select({ id: termsTable.id })
      .from(termsTable)
      .where(inArray(termsTable.id, termIds));
    const knownTermIds = new Set(knownTerms.map((term) => term.id));
    const missingTerms = termIds.filter((id) => !knownTermIds.has(id));
    if (missingTerms.length > 0) {
      console.error(
        `Term(s) ${missingTerms.join(", ")} do not exist in the terms table. ` +
          "Insert them first so the term selector can label them — see docs/fork-data-guide.md.",
      );
      process.exit(1);
    }

    const [rooms, roomAliases, existingClasses] = await Promise.all([
      db
        .select({ id: roomsTable.id, code: roomsTable.roomCode })
        .from(roomsTable),
      db
        .select({ alias: aliasesTable.alias, targetId: aliasesTable.targetId })
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
          acadGroup: classesTable.acadGroup,
          acadOrg: classesTable.acadOrg,
        })
        .from(classesTable)
        .where(inArray(classesTable.termId, termIds)),
    ]);

    const lookup = buildRoomLookup(rooms, roomAliases);
    const { rows, matched, roomless, unmatched } = resolveRooms(
      classes,
      lookup,
    );

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
      incomingRows: rows,
    });

    await db.transaction(async (tx) => {
      for (const id of removeIds) {
        await tx.delete(classesTable).where(eq(classesTable.id, id));
      }
      for (const { id, row } of updates) {
        await tx.update(classesTable).set(row).where(eq(classesTable.id, id));
      }
      const batchSize = 500;
      for (let i = 0; i < inserts.length; i += batchSize) {
        await tx.insert(classesTable).values(inserts.slice(i, i + batchSize));
      }
      await tx
        .update(updateTable)
        .set({ syncKey: randomUUID() })
        .where(eq(updateTable.tableName, "classes"));
      await tx
        .update(termsTable)
        .set({ classesImportedAt: new Date().toISOString() })
        .where(inArray(termsTable.id, termIds));
    });

    const lines = [
      `Generic class import (term(s) ${termIds.join(", ")})`,
      `  Rows in file: ${entries.length} → sections: ${classes.length}`,
      `  Room matches: ${matched.direct} direct, ${matched.alias} via alias, ${matched.fuzzy} fuzzy`,
      `  Imported without a room: ${roomless + [...unmatched.values()].reduce((a, b) => a + b, 0)} (${roomless} blank, ${unmatched.size} distinct unmatched code(s))`,
      `  DB changes: +${summary.inserted} ~${summary.updated} =${summary.unchanged} -${summary.removed}`,
    ];
    if (unmatched.size > 0) {
      lines.push("  Unmatched room codes (add rooms or aliases, then rerun):");
      for (const [code, count] of [...unmatched.entries()].sort(
        (a, b) => b[1] - a[1],
      )) {
        lines.push(`    ${count}× ${code}`);
      }
    }
    console.log(lines.join("\n"));
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
