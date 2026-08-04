import { describe, expect, it } from "bun:test";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import {
  buildBackfillOperations,
  loadSnapshots,
} from "../../../scripts/backfill-bulk-history";
import {
  BULK_ACTOR,
  bulkRowKey,
  bulkSummary,
  pendingRows,
  recordBulkHistory,
  toHistoryRow,
  type BulkHistoryRow,
  type BulkOperation,
} from "./bulk-history";

const op: BulkOperation = {
  opKey: "2026-08-03-test-op",
  entityType: "room",
  entityId: 42,
  before: { buildingId: 1 },
  after: { buildingId: 2 },
  reason: "moved to the right building",
};

/** Minimal stand-in for the Drizzle query builders this module uses. */
function fakeDb(
  seen: { entityType: string; entityId: number; summary: string }[],
) {
  const inserted: BulkHistoryRow[] = [];
  const db = {
    select: () => ({ from: () => ({ where: async () => seen }) }),
    insert: () => ({
      values: async (rows: BulkHistoryRow[]) => {
        inserted.push(...rows);
      },
    }),
  } as unknown as NodePgDatabase;
  return { db, inserted };
}

describe("toHistoryRow", () => {
  it("stamps the op key into the summary and defaults action + actor", () => {
    const row = toHistoryRow(op);
    expect(row.summary).toBe(
      "[bulk:2026-08-03-test-op] moved to the right building",
    );
    expect(row.action).toBe("bulk-update");
    expect(row.editedBy).toBe(BULK_ACTOR);
    expect(row.entityType).toBe("room");
    expect(row.entityId).toBe(42);
    expect(row.before).toEqual({ buildingId: 1 });
    expect(row.after).toEqual({ buildingId: 2 });
    expect(row.versionBefore).toBeNull();
  });

  it("keeps an explicit action and actor", () => {
    const row = toHistoryRow({ ...op, action: "merge" }, "import-amis");
    expect(row.action).toBe("merge");
    expect(row.editedBy).toBe("import-amis");
  });

  it("rejects input that would violate the editor_history columns", () => {
    expect(() => toHistoryRow({ ...op, opKey: "Has Spaces" })).toThrow(/opKey/);
    expect(() => toHistoryRow({ ...op, opKey: "brack]et" })).toThrow(/opKey/);
    expect(() => toHistoryRow({ ...op, entityType: "x".repeat(33) })).toThrow(
      /entityType/,
    );
    expect(() => toHistoryRow({ ...op, entityId: -1 })).toThrow(/entityId/);
    expect(() => toHistoryRow({ ...op, entityId: 1.5 })).toThrow(/entityId/);
    expect(() => toHistoryRow({ ...op, reason: "  " })).toThrow(/reason/);
    expect(() => toHistoryRow({ ...op, action: "a".repeat(33) })).toThrow(
      /action/,
    );
    expect(() => toHistoryRow(op, "a".repeat(101))).toThrow(/actor/);
  });
});

describe("bulkRowKey", () => {
  it("reads the op key back out of a stored summary", () => {
    expect(
      bulkRowKey({
        entityType: "room",
        entityId: 7,
        summary: bulkSummary("2026-08-03-merge", "why"),
      }),
    ).toBe("room:7:2026-08-03-merge");
  });

  it("does not match non-bulk history rows", () => {
    expect(
      bulkRowKey({ entityType: "room", entityId: 7, summary: "edited pin" }),
    ).toBe("room:7:");
  });
});

describe("pendingRows", () => {
  it("skips operations already recorded for the same entity", () => {
    const rows = [toHistoryRow(op)];
    const seen = [
      {
        entityType: "room",
        entityId: 42,
        summary: bulkSummary("2026-08-03-test-op", "different wording"),
      },
    ];
    expect(pendingRows(rows, seen)).toEqual([]);
  });

  it("keeps the same op key against a different entity", () => {
    const rows = [toHistoryRow(op)];
    const seen = [
      {
        entityType: "room",
        entityId: 43,
        summary: bulkSummary("2026-08-03-test-op", "other room"),
      },
    ];
    expect(pendingRows(rows, seen)).toHaveLength(1);
  });

  it("collapses duplicates inside one batch", () => {
    const rows = [toHistoryRow(op), toHistoryRow(op)];
    expect(pendingRows(rows, [])).toHaveLength(1);
  });
});

describe("recordBulkHistory", () => {
  it("writes nothing on a dry run", async () => {
    const { db, inserted } = fakeDb([]);
    const result = await recordBulkHistory(db, [op]);
    expect(result.dryRun).toBe(true);
    expect(result.pending).toHaveLength(1);
    expect(result.written).toBe(0);
    expect(inserted).toEqual([]);
  });

  it("inserts only the rows that are not already recorded", async () => {
    const second: BulkOperation = { ...op, entityId: 43 };
    const { db, inserted } = fakeDb([
      {
        entityType: "room",
        entityId: 42,
        summary: bulkSummary("2026-08-03-test-op", "already there"),
      },
    ]);
    const result = await recordBulkHistory(db, [op, second], { dryRun: false });
    expect(result.skipped).toBe(1);
    expect(result.written).toBe(1);
    expect(inserted).toHaveLength(1);
    expect(inserted[0]?.entityId).toBe(43);
  });

  it("is idempotent: a second run against its own output writes nothing", async () => {
    const first = fakeDb([]);
    await recordBulkHistory(first.db, [op], { dryRun: false });
    const replay = fakeDb(
      first.inserted.map((row) => ({
        entityType: row.entityType,
        entityId: row.entityId,
        summary: row.summary as string,
      })),
    );
    const result = await recordBulkHistory(replay.db, [op], { dryRun: false });
    expect(result.written).toBe(0);
    expect(replay.inserted).toEqual([]);
  });
});

describe("buildBackfillOperations", () => {
  const operations = buildBackfillOperations();

  it("covers every 2026-08-03/04 direct-database operation", () => {
    expect(operations.map((entry) => entry.opKey)).toEqual([
      "2026-08-03-sds-rooms-to-che",
      "2026-08-03-room-building-audit",
      "2026-08-03-duplicate-room-merge",
      "2026-08-04-sds-therio-aliases",
      "2026-08-04-proposal-28-directions",
    ]);
  });

  it("produces rows the recorder accepts", () => {
    for (const entry of operations)
      expect(() => toHistoryRow(entry)).not.toThrow();
  });

  it("pins proposal #28 to its real entity id", () => {
    const proposal = operations.find(
      (entry) => entry.opKey === "2026-08-04-proposal-28-directions",
    );
    expect(proposal?.entityType).toBe("proposal");
    expect(proposal?.entityId).toBe(28);
  });

  it("records the merge counts that the snapshot cannot recover", () => {
    const merge = operations.find(
      (entry) => entry.opKey === "2026-08-03-duplicate-room-merge",
    );
    expect(merge?.action).toBe("merge");
    expect(merge?.after).toMatchObject({
      roomsDeleted: 15,
      rowsRepointed: 222,
    });
  });

  it("emits one row per room when the building snapshot is available", () => {
    const withSnapshot = buildBackfillOperations({
      "rooms-building-snapshot.json": {
        rooms: [
          { id: 101, room_code: "CAS 101", building_id: null },
          { id: 102, room_code: "CAS 102", building_id: null },
        ],
      },
    });
    const perRoom = withSnapshot.filter(
      (entry) =>
        entry.opKey === "2026-08-03-room-building-audit" && entry.entityId > 0,
    );
    expect(perRoom.map((entry) => entry.entityId)).toEqual([101, 102]);
    expect(
      pendingRows(
        withSnapshot.map((entry) => toHistoryRow(entry)),
        [],
      ),
    ).toHaveLength(withSnapshot.length);
  });

  it("tolerates a missing snapshot directory", () => {
    expect(loadSnapshots("/nonexistent/scratchpad")).toEqual({});
  });
});
