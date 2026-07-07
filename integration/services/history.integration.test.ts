import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import pg from "pg";
import { integrationDatabaseUrl, skipWithoutE2eDb } from "../helpers/env";

const describeIntegration = skipWithoutE2eDb() ? describe.skip : describe;

describeIntegration("editor history revert integration", () => {
  let buildingId: number;
  let client: pg.Client;

  beforeAll(async () => {
    const url = integrationDatabaseUrl();
    if (!url) return;
    client = new pg.Client({ connectionString: url });
    await client.connect();
    const { rows } = await client.query<{ id: number }>(
      `SELECT id FROM buildings WHERE building_name = 'E2E Test Hall' LIMIT 1`,
    );
    buildingId = rows[0]?.id ?? 0;
    expect(buildingId).toBeGreaterThan(0);
  });

  afterAll(async () => {
    await client?.end();
  });

  test("revert restores the snapshot and records a revert history row", async () => {
    const { updateBuilding } = await import("@lib/services/admin-service");
    const { getEntityHistory, revertToHistoryEntry } = await import(
      "@lib/services/history-service"
    );

    const original = await client.query<{
      version: number;
      directions: string;
    }>(`SELECT version, directions FROM buildings WHERE id = $1`, [buildingId]);
    const startVersion = original.rows[0]?.version ?? 1;

    // Make an edit we will restore over.
    const marker = `history-test-${Date.now()}`;
    const edited = await updateBuilding(
      buildingId,
      { directions: marker },
      startVersion,
      "e2e-admin",
    );
    expect(edited?.directions).toBe(marker);

    const entries = await getEntityHistory("building", buildingId);
    expect(entries.length).toBeGreaterThanOrEqual(2);
    // entries[0] is the marker edit; entries[1].after holds the prior state.
    const target = entries[1];
    expect(target?.after).toBeTruthy();

    const restored = (await revertToHistoryEntry({
      historyId: target.id,
      expectedVersion: edited?.version ?? startVersion + 1,
      editedBy: "e2e-admin",
      summary: "integration revert test",
    })) as { directions?: string; version?: number } | null;

    expect(restored?.directions).toBe(
      (target.after as { directions?: string }).directions,
    );
    expect(restored?.version).toBe((edited?.version ?? 0) + 1);

    const [latest] = await getEntityHistory("building", buildingId);
    expect(latest.action).toBe("revert");
    expect(latest.summary).toBe("integration revert test");
  });

  test("room revert restores the room code (snapshot stores it as `code`)", async () => {
    const { updateRoom } = await import("@lib/services/admin-service");
    const { getEntityHistory, revertToHistoryEntry } = await import(
      "@lib/services/history-service"
    );

    const room = await client.query<{
      id: number;
      room_code: string;
      version: number;
    }>(`SELECT id, room_code, version FROM rooms ORDER BY id LIMIT 1`);
    const roomId = room.rows[0]?.id ?? 0;
    const originalCode = room.rows[0]?.room_code ?? "";
    const roomVersion = room.rows[0]?.version ?? 1;
    expect(roomId).toBeGreaterThan(0);

    // Two renames so an entry exists whose after-snapshot holds -H1.
    const firstRename = await updateRoom(
      roomId,
      { roomCode: `${originalCode}-H1` },
      roomVersion,
      "e2e-admin",
    );
    expect(firstRename?.code).toBe(`${originalCode}-H1`);
    const secondRename = await updateRoom(
      roomId,
      { roomCode: `${originalCode}-H2` },
      firstRename?.version,
      "e2e-admin",
    );
    expect(secondRename?.code).toBe(`${originalCode}-H2`);

    const entries = await getEntityHistory("room", roomId);
    const target = entries.find(
      (entry) =>
        (entry.after as { code?: string })?.code === `${originalCode}-H1`,
    );
    expect(target).toBeTruthy();

    const restored = (await revertToHistoryEntry({
      historyId: target?.id ?? 0,
      expectedVersion: secondRename?.version ?? 0,
      editedBy: "e2e-admin",
      summary: "restore earlier room code",
    })) as { code?: string; version?: number } | null;
    expect(restored?.code).toBe(`${originalCode}-H1`);

    // Leave the shared fixture as we found it.
    const cleanup = await updateRoom(
      roomId,
      { roomCode: originalCode },
      restored?.version,
      "e2e-admin",
    );
    expect(cleanup?.code).toBe(originalCode);
  });

  test("revert with stale expectedVersion throws EditConflictError", async () => {
    const { EditConflictError } = await import("@lib/services/admin-service");
    const { getEntityHistory, revertToHistoryEntry } = await import(
      "@lib/services/history-service"
    );
    const [latest] = await getEntityHistory("building", buildingId);
    expect(latest?.after).toBeTruthy();

    await expect(
      revertToHistoryEntry({
        historyId: latest.id,
        expectedVersion: 999_999,
        editedBy: "e2e-admin",
        summary: "should conflict",
      }),
    ).rejects.toBeInstanceOf(EditConflictError);
  });
});
