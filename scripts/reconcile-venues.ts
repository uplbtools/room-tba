/**
 * Reconcile free-typed AMIS/registrar venue strings against the rooms table.
 *
 * AMIS venues are typed by hand, so every term ships spacing/case/abbreviation
 * variants plus venues that have no rooms row at all (PE areas, PS A-xxx,
 * IMSP PCs). This script:
 *   1. Seeds curated alias rows for known renames (ICS LH3 -> SMA LH, ...).
 *   2. Fixes known typo room codes (CAS 1043 -> CAS 104).
 *   3. Creates rooms for recurring unmatched venues (>= --min-count across all
 *      data/amis-*.json + data/final-exams-*.json), inferring building_id when
 *      every existing room sharing the venue's first word sits in one building.
 *
 * Dry-run by default; pass --apply to write. Rerun after adding a new term's
 * JSON. After applying, re-run import:amis-classes / import:final-exams so
 * class rows pick up the new room ids.
 *
 *   DATABASE_URL=… bun run scripts/reconcile-venues.ts [--apply] [--min-count 5]
 */

import { readdirSync, readFileSync } from "node:fs";
import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { aliasesTable, roomsTable } from "@drizzle/schema";
import { buildRoomLookup, matchRoomId } from "@lib/amis/import-classes";
import { normalizeFacilityKey } from "@lib/amis/normalize-class";
import { normalizeAlias } from "@lib/site";

config({ path: ".env" });

const ALIAS_SOURCE = "venue_reconcile";
const ROOM_SOURCE_CATEGORY = null; // rooms created bare; editors can categorize

/** Known renames/nicknames -> existing room code. Extend as new ones surface.
 * If a target is itself a room this script creates (e.g. "Chess Room"), run
 * with --apply twice: rooms first, then the alias resolves. */
const CURATED_ALIASES: Record<string, string> = {
  "ICS LH 3": "SMA LH",
  "ICSLH 3": "SMA LH",
  ICSLH3: "SMA LH",
  "ICS LH 4": "MMM LH",
  "ICSLH 4": "MMM LH",
  ICSLH4: "MMM LH",
  "ICS MEGA HALL": "EAA LH",
  "LITE ROOM 4": "CAS LITE 4",
  "LITE ROOM 5": "CAS LITE 5",
  // PE venues: AMIS types EB Gym shorthand; the Copeland rooms already exist.
  "MA-EB GYM": "MARTIAL ARTS AREA",
  "DA1-EB GYM": "DANCE AREA 1",
  "DA1 EB Gym": "DANCE AREA 1",
  "DA2-EB GYM": "DANCE AREA 2",
  "DA2 EB Gym": "DANCE AREA 2",
  "Ballet Area EB Gym": "BALLET AREA",
  "BALLET ARE": "BALLET AREA",
  "BB Court EB Gym": "BASKETBALL COURT",
  "BB AREA": "BASKETBALL COURT",
  "BT Court EB Gym": "BADMINTON COURT",
  "BT AREA": "BADMINTON COURT",
  "TTN AREA": "TABLE TENNIS AREA",
  "TTN Area EB Gym": "TABLE TENNIS AREA",
  "VB COURT": "VOLLEYBALL AREA",
  "VB Court EB Gym": "VOLLEYBALL AREA",
  "VOLLEYBALL COURT": "VOLLEYBALL AREA",
  "BR Room EB Gym": "BRIDGE ROOM",
  "WT RM-EB": "WEIGHT TRAINING AREA",
  "YOGA-EB": "YOGA ROOM",
  POOL: "SWIMMING POOL",
  "SWIMMING POOL AREA": "SWIMMING POOL",
  "LR2A-EBGYM": "LR2A",
  "LR2-A EB Gym": "LR2A",
  "LR2B-EBGYM": "LR2B",
  "LR2-B EB Gym": "LR2B",
  "LR2-B-EBGYM": "LR2B",
  "LR3A-EBGYM": "LR3A",
  "LR3-A EB GYM": "LR3A",
  "LR3A-EB GYM": "LR3A",
  "LR3B-EBGYM": "LR3B",
  "LR3-B EB Gym": "LR3B",
  "CH-EB GYM": "Chess Room",
  "Martials Arts Area": "MARTIAL ARTS AREA",
  "Yoga Rm. EB Gym": "YOGA ROOM",
  "WT RM-EB Gym": "WEIGHT TRAINING AREA",
  "WEIGHTS ROOM": "WEIGHT TRAINING AREA",
  "DA2 EB Copeland Gym": "DANCE AREA 2",
  // Non-PE nicknames/typos
  "LITE RM5": "CAS LITE 5",
  "CAS LITE Rm 5": "CAS LITE 5",
  "CAS BO3": "CAS B03", // letter O vs zero
};

/** Venues that are placeholders, not places. */
const SKIP_VENUES = new Set(["UPLB", "TBA"]);

/** Venue pattern -> building id when prefix inference can't see it. */
const BUILDING_HINTS: [RegExp, number][] = [
  [/EB ?GYM|-EB\b/i, 32], // Copeland Gymnasium
  [/^Chess Room$/i, 32],
  [/^TCC ?-?\d/i, 37], // Temporary Common Classrooms
  [/^SU$/, 55], // Student Union Building
  [/^UPLB (GS|Grad School)$|^MPH ?\(GS\)$/i, 20], // Graduate School
  [/^AMPED/i, 1], // AMPED Building
  [/^HNF/i, 27], // IHNF Building
  [/^CEM /i, 12], // two DAAE-tagged CEM rooms poison prefix inference
];

/** Typo'd room codes in the DB -> what AMIS actually types. */
const ROOM_CODE_FIXES: Record<string, string> = {
  "CAS 1043": "CAS 104",
};

function parseArgs(argv: string[]) {
  let apply = false;
  let minCount = 5;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--apply") apply = true;
    else if (argv[i] === "--min-count") minCount = Number(argv[++i]);
  }
  if (!Number.isFinite(minCount) || minCount < 1) {
    throw new Error("Invalid --min-count");
  }
  return { apply, minCount };
}

function collectVenueCounts(): Map<string, number> {
  const counts = new Map<string, number>();
  const add = (value: unknown) => {
    if (typeof value !== "string") return;
    const venue = value.trim();
    if (!venue) return;
    counts.set(venue, (counts.get(venue) ?? 0) + 1);
  };

  for (const file of readdirSync("data")) {
    if (file.startsWith("amis-") && file.endsWith(".json")) {
      const raw = JSON.parse(readFileSync(`data/${file}`, "utf8"));
      const rows = Array.isArray(raw) ? raw : (raw.classes ?? raw.data ?? []);
      for (const row of rows) {
        add(row.facility_id ?? row.facility_code ?? row.room_code);
      }
    }
    if (/^final-exams-\d+\.json$/.test(file)) {
      const raw = JSON.parse(readFileSync(`data/${file}`, "utf8"));
      for (const row of raw.exams ?? []) add(row.room_code);
    }
  }
  return counts;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }
  const pool = new pg.Pool({ connectionString });
  const db = drizzle(pool);

  try {
    const rooms = await db
      .select({
        id: roomsTable.id,
        code: roomsTable.roomCode,
        buildingId: roomsTable.buildingId,
      })
      .from(roomsTable);
    const roomAliases = await db
      .select({ alias: aliasesTable.alias, targetId: aliasesTable.targetId })
      .from(aliasesTable)
      .where(eq(aliasesTable.targetType, "room"));

    // --- 1. Curated aliases -------------------------------------------------
    const roomIdByKey = new Map(
      rooms.map((room) => [normalizeFacilityKey(room.code), room.id]),
    );
    const aliasInserts: (typeof aliasesTable.$inferInsert)[] = [];
    for (const [alias, targetCode] of Object.entries(CURATED_ALIASES)) {
      const targetId = roomIdByKey.get(normalizeFacilityKey(targetCode));
      if (targetId == null) {
        console.warn(`Curated alias target missing: ${targetCode}`);
        continue;
      }
      aliasInserts.push({
        alias,
        normalizedAlias: normalizeAlias(alias),
        targetType: "room",
        targetId,
        source: ALIAS_SOURCE,
        confidence: "curated",
      });
    }

    // --- 2. Room-code typo fixes -------------------------------------------
    const codeFixes: { id: number; from: string; to: string }[] = [];
    for (const [from, to] of Object.entries(ROOM_CODE_FIXES)) {
      const room = rooms.find((entry) => entry.code === from);
      if (room) codeFixes.push({ id: room.id, from, to });
    }

    // --- 3. Recurring unmatched venues -> new rooms -------------------------
    // Apply fixes/aliases to the lookup first so venues they cover don't also
    // spawn rooms.
    const lookupRooms = rooms.map((room) => {
      const fix = codeFixes.find((entry) => entry.id === room.id);
      return { id: room.id, code: fix ? fix.to : room.code };
    });
    const lookup = buildRoomLookup(lookupRooms, [
      ...roomAliases,
      ...aliasInserts.map((row) => ({
        alias: row.alias,
        targetId: row.targetId,
      })),
    ]);

    // building inference: first word of an existing room code -> building set
    const buildingsByPrefix = new Map<string, Set<number>>();
    for (const room of rooms) {
      if (room.buildingId == null) continue;
      const prefix = normalizeFacilityKey(room.code).split(" ")[0];
      if (!buildingsByPrefix.has(prefix)) {
        buildingsByPrefix.set(prefix, new Set());
      }
      buildingsByPrefix.get(prefix)?.add(room.buildingId);
    }
    const inferBuilding = (venue: string): number | null => {
      for (const [pattern, buildingId] of BUILDING_HINTS) {
        if (pattern.test(venue)) return buildingId;
      }
      const prefix = normalizeFacilityKey(venue).split(" ")[0];
      const candidates = buildingsByPrefix.get(prefix);
      return candidates?.size === 1 ? [...candidates][0] : null;
    };

    const counts = collectVenueCounts();
    // Group venue variants by squashed key; the most frequent variant becomes
    // the room code and the fuzzy matcher absorbs the rest.
    const groups = new Map<string, { venue: string; count: number }[]>();
    for (const [venue, count] of counts) {
      if (matchRoomId(lookup, venue)) continue;
      if (/\s{2,}/.test(venue)) continue; // registrar column bleed, not a venue
      if (SKIP_VENUES.has(venue.toUpperCase())) continue;
      const key = normalizeFacilityKey(venue).replace(/[^A-Z0-9]/g, "");
      if (!key) continue;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)?.push({ venue, count });
    }

    const newRooms: {
      code: string;
      buildingId: number | null;
      totalCount: number;
      variants: string[];
    }[] = [];
    for (const variants of groups.values()) {
      const totalCount = variants.reduce((sum, entry) => sum + entry.count, 0);
      if (totalCount < options.minCount) continue;
      variants.sort((a, b) => b.count - a.count);
      const canonical = variants[0].venue;
      newRooms.push({
        code: canonical,
        buildingId: inferBuilding(canonical),
        totalCount,
        variants: variants.map((entry) => entry.venue),
      });
    }
    newRooms.sort((a, b) => b.totalCount - a.totalCount);

    // --- Report -------------------------------------------------------------
    console.log(`Aliases to insert: ${aliasInserts.length}`);
    for (const row of aliasInserts) {
      console.log(`  ${row.alias} -> room ${row.targetId}`);
    }
    console.log(`Room code fixes: ${codeFixes.length}`);
    for (const fix of codeFixes) {
      console.log(`  #${fix.id} ${fix.from} -> ${fix.to}`);
    }
    console.log(
      `New rooms (venues with >= ${options.minCount} rows): ${newRooms.length}`,
    );
    for (const room of newRooms) {
      const extras =
        room.variants.length > 1
          ? ` (variants: ${room.variants.slice(1).join(", ")})`
          : "";
      console.log(
        `  ${room.totalCount}× ${room.code} [building ${room.buildingId ?? "—"}]${extras}`,
      );
    }

    if (!options.apply) {
      console.log("\nDry run. Pass --apply to write.");
      return;
    }

    await db.transaction(async (tx) => {
      for (const fix of codeFixes) {
        await tx
          .update(roomsTable)
          .set({ roomCode: fix.to })
          .where(eq(roomsTable.id, fix.id));
      }
      for (const row of aliasInserts) {
        await tx.insert(aliasesTable).values(row).onConflictDoNothing();
      }
      for (const room of newRooms) {
        await tx.insert(roomsTable).values({
          roomCode: room.code,
          buildingId: room.buildingId,
          category: ROOM_SOURCE_CATEGORY,
        });
      }
    });
    console.log(
      `\nApplied: ${codeFixes.length} code fixes, ${aliasInserts.length} aliases, ${newRooms.length} rooms. Re-run the class/finals imports next.`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
