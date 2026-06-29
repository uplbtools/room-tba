#!/usr/bin/env bun
/**
 * Import AMIS class schedules into Supabase/Postgres.
 *
 * Usage:
 *   bun run import:amis-classes -- --file data/AMIS\ subjects.json --term-id 20251
 *
 * The script is idempotent per term: it deletes existing classes for the
 * target term before inserting the new batch, so re-running with the same
 * term replaces rather than duplicates.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { classesTable, roomsTable, termsTable } from "@drizzle/schema";
import { eq, sql } from "drizzle-orm";
import { readFileSync } from "fs";
import { resolve } from "path";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

function parseArgs() {
  const args = process.argv.slice(2);
  let file = "data/AMIS subjects.json";
  let termId: number | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--file" && args[i + 1]) {
      file = args[i + 1];
      i++;
    }
    if (args[i] === "--term-id" && args[i + 1]) {
      termId = Number(args[i + 1]);
      i++;
    }
  }
  return { file, termId };
}

async function main() {
  const { file, termId: cliTermId } = parseArgs();
  const filePath = resolve(file);

  let raw: { classes?: unknown[]; term_id?: number };
  try {
    raw = JSON.parse(readFileSync(filePath, "utf-8"));
  } catch {
    console.error(`Cannot read or parse ${filePath}`);
    process.exit(1);
  }

  const amisClasses = Array.isArray(raw.classes) ? raw.classes : [];
  if (amisClasses.length === 0) {
    console.error("No classes found in JSON");
    process.exit(1);
  }

  const client = postgres(DATABASE_URL!, { prepare: false });
  const db = drizzle(client);

  // Resolve term
  let targetTermId = cliTermId;
  if (!targetTermId && raw.term_id) {
    targetTermId = Number(raw.term_id);
  }
  if (!targetTermId) {
    const activeTerms = await db
      .select()
      .from(termsTable)
      .where(eq(termsTable.isActive, true))
      .limit(1);
    if (activeTerms[0]) {
      targetTermId = activeTerms[0].id;
    }
  }
  if (!targetTermId) {
    console.error("No term_id provided and no active term found");
    await client.end();
    process.exit(1);
  }

  console.log(
    `Importing ${amisClasses.length} classes for term ${targetTermId}...`,
  );

  // Build room lookup
  const rooms = await db
    .select({ id: roomsTable.id, code: roomsTable.roomCode })
    .from(roomsTable);
  const roomByCode = new Map<string, number>();
  for (const r of rooms) {
    if (r.code) roomByCode.set(r.code, r.id);
  }

  const unmatchedFacilities = new Set<string>();
  const rows: {
    courseCode: string;
    section: string;
    type: string;
    schedule: string[];
    roomId: number | null;
    courseTitle: string;
    termId: number;
  }[] = [];

  for (const cls of amisClasses as any[]) {
    const facilityId = String(cls.facility_id ?? "");
    let roomId: number | null = roomByCode.get(facilityId) ?? null;
    if (!roomId && facilityId) {
      unmatchedFacilities.add(facilityId);
    }

    const schedule: string[] = (cls.class_dates ?? []).map(
      (s: any) =>
        `${s.date} ${s.start_time?.replace(" ", "")}-${s.end_time?.replace(" ", "")}`,
    );

    const courseTitle = cls.course?.title
      ? `${cls.course.title}${(cls.course_code ?? "").includes("HK 12") ? ` (${cls.activity})` : ""}`
      : "";

    rows.push({
      courseCode: String(cls.course_code ?? "").slice(0, 16),
      section: String(cls.section ?? "").slice(0, 16),
      type: String(cls.type ?? "").slice(0, 12),
      schedule,
      roomId,
      courseTitle: courseTitle.slice(0, 500),
      termId: targetTermId,
    });
  }

  // Replace existing classes for this term
  const deleted = await db
    .delete(classesTable)
    .where(eq(classesTable.termId, targetTermId));
  console.log(`Deleted existing classes for term ${targetTermId}`);

  // Insert in batches
  const BATCH = 500;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    await db.insert(classesTable).values(batch);
    console.log(`  Inserted ${i + batch.length}/${rows.length}`);
  }

  if (unmatchedFacilities.size > 0) {
    console.warn("\nUnmatched facilities (no room found):");
    for (const f of Array.from(unmatchedFacilities).sort()) {
      console.warn(`  - ${f}`);
    }
    console.warn("\nAdd aliases or room codes, then re-run.");
  }

  console.log(
    `\nDone. ${rows.length} classes imported for term ${targetTermId}.`,
  );
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
