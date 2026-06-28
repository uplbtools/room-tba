/**
 * Export Room TBA database tables to JSON for ChatGPT Deep Research attachment.
 *
 * Usage:
 *   DATABASE_URL=... ./node_modules/.bin/bun run scripts/export-for-deep-research.ts
 *   ./node_modules/.bin/bun run scripts/export-for-deep-research.ts --sqlite data/info.db
 *
 * Writes to exports/deep-research/ with a manifest.json describing each file.
 */

import Database from "bun:sqlite";
import { drizzle as drizzleSqlite } from "drizzle-orm/bun-sqlite";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";
import {
  buildingsTable,
  classesTable,
  collegesTable,
  divisionsTable,
  dormsTable,
  roomsTable,
  termsTable,
} from "@drizzle/schema";

const OUT_DIR = join(import.meta.dir, "..", "exports", "deep-research");
// Fallback term label when the terms table is unavailable (e.g. SQLite export).
const TERM = "AY 2025-2026 2nd Semester";
const EXPORTED_AT = new Date().toISOString();

type ExportManifest = {
  exported_at: string;
  term_target: string;
  source: "postgres" | "sqlite";
  counts: Record<string, number>;
  files: string[];
  schema_notes: Record<string, string[]>;
};

function writeJson(name: string, data: unknown) {
  const path = join(OUT_DIR, name);
  writeFileSync(path, JSON.stringify(data, null, 2));
  return name;
}

async function exportFromPostgres(connectionString: string) {
  const pool = new pg.Pool({ connectionString });
  const db = drizzlePg(pool);

  let termLabel = TERM;
  try {
    const [defaultTerm] = await db
      .select()
      .from(termsTable)
      .where(eq(termsTable.isDefault, true))
      .limit(1);
    if (defaultTerm?.label) termLabel = defaultTerm.label;
  } catch {
    // terms table not migrated yet — keep the fallback label.
  }

  const buildings = await db.select().from(buildingsTable);
  const colleges = await db.select().from(collegesTable);
  const divisions = await db.select().from(divisionsTable);
  const dorms = await db.select().from(dormsTable);

  const rooms = await db
    .select({
      id: roomsTable.id,
      room_code: roomsTable.roomCode,
      directions: roomsTable.directions,
      building_name: buildingsTable.buildingName,
      college_name: collegesTable.collegeName,
      division_name: divisionsTable.divisionName,
    })
    .from(roomsTable)
    .leftJoin(buildingsTable, eq(buildingsTable.id, roomsTable.buildingId))
    .leftJoin(collegesTable, eq(collegesTable.id, roomsTable.collegeId))
    .leftJoin(divisionsTable, eq(divisionsTable.id, roomsTable.divisionId));

  const classes = await db
    .select({
      course_code: classesTable.courseCode,
      section: classesTable.section,
      type: classesTable.type,
      schedule: classesTable.schedule,
      course_title: classesTable.courseTitle,
      term_id: classesTable.termId,
      room_code: roomsTable.roomCode,
      building_name: buildingsTable.buildingName,
    })
    .from(classesTable)
    .leftJoin(roomsTable, eq(roomsTable.id, classesTable.roomId))
    .leftJoin(buildingsTable, eq(buildingsTable.id, roomsTable.buildingId));

  await pool.end();

  return { buildings, colleges, divisions, dorms, rooms, classes, termLabel };
}

function exportFromSqlite(sqlitePath: string) {
  const client = new Database(sqlitePath);
  const db = drizzleSqlite({ client });

  const buildings = db.select().from(buildingsTable).all();
  const colleges = db.select().from(collegesTable).all();
  const divisions = db.select().from(divisionsTable).all();
  const dorms = db.select().from(dormsTable).all();

  const rooms = db
    .select({
      id: roomsTable.id,
      room_code: roomsTable.roomCode,
      directions: roomsTable.directions,
      building_name: buildingsTable.buildingName,
      college_name: collegesTable.collegeName,
      division_name: divisionsTable.divisionName,
    })
    .from(roomsTable)
    .leftJoin(buildingsTable, eq(buildingsTable.id, roomsTable.buildingId))
    .leftJoin(collegesTable, eq(collegesTable.id, roomsTable.collegeId))
    .leftJoin(divisionsTable, eq(divisionsTable.id, roomsTable.divisionId))
    .all();

  const classes = db
    .select({
      course_code: classesTable.courseCode,
      section: classesTable.section,
      type: classesTable.type,
      schedule: classesTable.schedule,
      course_title: classesTable.courseTitle,
      term_id: classesTable.termId,
      room_code: roomsTable.roomCode,
      building_name: buildingsTable.buildingName,
    })
    .from(classesTable)
    .leftJoin(roomsTable, eq(roomsTable.id, classesTable.roomId))
    .leftJoin(buildingsTable, eq(buildingsTable.id, roomsTable.buildingId))
    .all();

  client.close();

  return {
    buildings,
    colleges,
    divisions,
    dorms,
    rooms,
    classes,
    termLabel: TERM,
  };
}

function roomCodeStats(classes: { room_code: string | null }[]) {
  const byRoom = new Map<string, number>();
  for (const c of classes) {
    const code = c.room_code ?? "(null)";
    byRoom.set(code, (byRoom.get(code) ?? 0) + 1);
  }
  return [...byRoom.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 200)
    .map(([room_code, class_count]) => ({ room_code, class_count }));
}

const sqliteArg = process.argv.indexOf("--sqlite");
const sqlitePath =
  sqliteArg >= 0 ? process.argv[sqliteArg + 1] : "data/info.db";
const postgresUrl = process.env.DATABASE_URL;

mkdirSync(OUT_DIR, { recursive: true });

const data = postgresUrl
  ? await exportFromPostgres(postgresUrl)
  : exportFromSqlite(sqlitePath);

const source = postgresUrl ? "postgres" : "sqlite";

const files = [
  writeJson("buildings.json", data.buildings),
  writeJson("colleges.json", data.colleges),
  writeJson("divisions.json", data.divisions),
  writeJson("dorms.json", data.dorms),
  writeJson("rooms.json", data.rooms),
  writeJson("classes.json", data.classes),
  writeJson("classes-by-room-top200.json", roomCodeStats(data.classes)),
];

const manifest: ExportManifest = {
  exported_at: EXPORTED_AT,
  term_target: data.termLabel,
  source,
  counts: {
    buildings: data.buildings.length,
    colleges: data.colleges.length,
    divisions: data.divisions.length,
    dorms: data.dorms.length,
    rooms: data.rooms.length,
    classes: data.classes.length,
  },
  files,
  schema_notes: {
    buildings: [
      "building_name",
      "lat",
      "lon",
      "directions",
      "type (admin|non-admin)",
    ],
    rooms: [
      "room_code",
      "directions",
      "building_name",
      "college_name",
      "division_name",
    ],
    classes: [
      "course_code",
      "section",
      "type",
      "schedule[]",
      "course_title",
      "room_code",
      "building_name",
      "term_id",
    ],
    dorms: [
      "dorm_name",
      "short_name",
      "lat",
      "lon",
      "gender",
      "capacity",
      "managing_office",
      "amenities",
      "is_up_managed",
    ],
  },
};

writeJson("manifest.json", manifest);

console.log(`Exported from ${source} → ${OUT_DIR}`);
console.log(JSON.stringify(manifest.counts, null, 2));
