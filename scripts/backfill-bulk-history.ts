/**
 * One-off: write the missing `editor_history` rows for the direct-to-database
 * corrections made on 2026-08-03 / 2026-08-04. Those ran as raw SQL and merge
 * scripts, so they left no audit trail — this closes the gap after the fact.
 *
 * Dry run by default. Idempotent: each operation carries a dated op key and a
 * second run skips whatever is already recorded (see `bulk-history.ts`).
 *
 * Usage:
 *   bun run scripts/backfill-bulk-history.ts                        # dry run
 *   bun run scripts/backfill-bulk-history.ts --snapshots <dir>      # richer before-state
 *   bun run scripts/backfill-bulk-history.ts --ops ops.json         # supply the list instead
 *   bun run scripts/backfill-bulk-history.ts --apply                # maintainer only
 *
 * Snapshots are the JSON dumps taken before each operation
 * (`room-merge-snapshot.json`, `rooms-building-snapshot.json`,
 * `rooms-map-snapshot.json`). When a snapshot is missing the operation is
 * still recorded, as one summary row with the counts instead of one row per
 * affected entity. See docs/bulk-data-history.md.
 */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { BulkOperation } from "../src/lib/services/bulk-history";
import { recordBulkHistory } from "../src/lib/services/bulk-history";
import {
  flagValue,
  openDb,
  readOperations,
  reportResult,
} from "./record-bulk-history";

/** Where the maintainer session left its pre-operation dumps. */
const DEFAULT_SNAPSHOT_ROOT =
  "/tmp/claude-1000/-home-stimmie-dev-uplbtools-room-tba";

export const SNAPSHOT_NAMES = [
  "room-merge-snapshot.json",
  "rooms-building-snapshot.json",
  "rooms-map-snapshot.json",
] as const;

export type SnapshotName = (typeof SNAPSHOT_NAMES)[number];
export type Snapshots = Partial<Record<SnapshotName, unknown>>;

type RoomSnapshotRow = {
  id: number;
  room_code?: string;
  building_id?: number | null;
};

/** Candidate directories, newest session first, that may hold the snapshots. */
function snapshotDirs(explicit?: string): string[] {
  if (explicit) return [explicit];
  if (!existsSync(DEFAULT_SNAPSHOT_ROOT)) return [];
  return readdirSync(DEFAULT_SNAPSHOT_ROOT)
    .map((session) => join(DEFAULT_SNAPSHOT_ROOT, session, "scratchpad"))
    .filter((dir) => existsSync(dir));
}

export function loadSnapshots(explicitDir?: string): Snapshots {
  const found: Snapshots = {};
  for (const dir of snapshotDirs(explicitDir)) {
    for (const name of SNAPSHOT_NAMES) {
      const path = join(dir, name);
      if (found[name] || !existsSync(path)) continue;
      found[name] = JSON.parse(readFileSync(path, "utf8"));
    }
  }
  return found;
}

function rowsOf(snapshot: unknown): RoomSnapshotRow[] {
  const rooms = (snapshot as { rooms?: unknown } | undefined)?.rooms;
  return Array.isArray(rooms) ? (rooms as RoomSnapshotRow[]) : [];
}

/** Row counts per referencing table, without inlining hundreds of ids. */
function refCounts(snapshot: unknown): Record<string, number> {
  const refs = (snapshot as { refs?: Record<string, unknown[]> } | undefined)
    ?.refs;
  if (!refs) return {};
  return Object.fromEntries(
    Object.entries(refs).map(([table, rows]) => [
      table,
      Array.isArray(rows) ? rows.length : 0,
    ]),
  );
}

/**
 * The operations performed on prod on 2026-08-03 / 04.
 *
 * ponytail: one summary row per operation, `entityId: 0`, unless a snapshot
 * supplies the affected ids — the merge snapshot records the candidate rooms
 * but not which of them were kept, so per-room rows there would attach
 * "merged" history to rooms that were never touched.
 */
export function buildBackfillOperations(
  snapshots: Snapshots = {},
): BulkOperation[] {
  const buildingRooms = rowsOf(snapshots["rooms-building-snapshot.json"]);
  const mapRooms = rowsOf(snapshots["rooms-map-snapshot.json"]);
  const mergeSnapshot = snapshots["room-merge-snapshot.json"];
  const mergeRooms = rowsOf(mergeSnapshot);

  const operations: BulkOperation[] = [];

  operations.push({
    opKey: "2026-08-03-sds-rooms-to-che",
    entityType: "room",
    entityId: 0,
    action: "bulk-update",
    before: { buildingName: "CVM-IAS Communal", rooms: 7 },
    after: { buildingName: "CHE Building", rooms: 7 },
    reason:
      "SDS fix: 7 rooms were filed under CVM-IAS Communal but are physically in the CHE Building; moved to the correct building.",
  });

  operations.push({
    opKey: "2026-08-03-room-building-audit",
    entityType: "room",
    entityId: 0,
    action: "bulk-update",
    before: {
      note: "rooms with a missing or wrong building_id",
      rooms: buildingRooms.length || 31,
    },
    after: {
      note: "building_id corrected from the manual room/building audit",
      rooms: buildingRooms.length || 31,
      roomIds: buildingRooms.map((room) => room.id),
    },
    reason:
      "Room/building audit: 31 rooms were given their correct building after a manual pass over unmatched and mis-filed rooms.",
  });

  // Per-room rows when the pre-audit snapshot is available.
  for (const room of buildingRooms) {
    operations.push({
      opKey: "2026-08-03-room-building-audit",
      entityType: "room",
      entityId: room.id,
      action: "bulk-update",
      before: room,
      after: { id: room.id, note: "building corrected by the audit" },
      reason: `Room/building audit: corrected the building of ${room.room_code ?? `room #${room.id}`}.`,
    });
  }

  operations.push({
    opKey: "2026-08-03-duplicate-room-merge",
    entityType: "room",
    entityId: 0,
    action: "merge",
    before: {
      duplicateGroups: 16,
      candidateRooms: mergeRooms,
      references: refCounts(mergeSnapshot),
    },
    after: {
      roomsDeleted: 15,
      rowsRepointed: 222,
      repointedTables: ["classes", "final_exams"],
      note: "dropped spellings kept as aliases so search and imports still resolve them",
    },
    reason:
      "Merged 16 duplicate room groups: 222 class and final-exam rows were repointed at the canonical room, 15 duplicate rooms deleted, and every dropped spelling preserved as an alias.",
  });

  operations.push({
    opKey: "2026-08-04-sds-therio-aliases",
    entityType: "alias",
    entityId: 0,
    action: "create",
    before: null,
    after: { note: "SDS and therio room aliases inserted" },
    reason:
      "Inserted the SDS and therio aliases so AMIS facility strings for those rooms match an existing room instead of being skipped.",
  });

  operations.push({
    opKey: "2026-08-04-proposal-28-directions",
    entityType: "proposal",
    entityId: 28,
    action: "bulk-update",
    before: { note: "directions patch carried an internal admin note" },
    after: { note: "admin note stripped from the directions field" },
    reason:
      "Edited proposal #28's patch to strip an internal admin note that would have been published verbatim into the room's directions.",
  });

  if (mapRooms.length > 0) {
    operations.push({
      opKey: "2026-08-03-room-map-snapshot",
      entityType: "room",
      entityId: 0,
      action: "bulk-update",
      before: { rooms: mapRooms.length },
      after: { roomIds: mapRooms.map((room) => room.id) },
      reason:
        "Map-position snapshot taken alongside the 2026-08-03 room corrections.",
    });
  }

  return operations;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const opsPath = flagValue(argv, "--ops");
  const snapshots = loadSnapshots(flagValue(argv, "--snapshots"));

  if (opsPath) {
    console.log(`Operations from ${opsPath}`);
  } else {
    const names = Object.keys(snapshots);
    console.log(
      names.length > 0
        ? `Snapshots found: ${names.join(", ")}`
        : "No snapshots found; recording summary rows only.",
    );
  }

  const operations = opsPath
    ? readOperations(opsPath)
    : buildBackfillOperations(snapshots);

  const { db, close } = openDb();
  try {
    const result = await recordBulkHistory(db, operations, {
      dryRun: !argv.includes("--apply"),
    });
    reportResult(result);
  } finally {
    await close();
  }
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
