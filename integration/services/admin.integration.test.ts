import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { connectE2eClient, type E2eClient } from "../../scripts/e2e-schema";
import {
  integrationDatabaseUrl,
  integrationPassword,
  skipWithoutE2eDb,
} from "../helpers/env";

const describeIntegration = skipWithoutE2eDb() ? describe.skip : describe;

describeIntegration("admin building service integration", () => {
  let buildingId: number;
  let client: E2eClient;

  beforeAll(async () => {
    const url = integrationDatabaseUrl();
    if (!url) return;
    client = await connectE2eClient(url);
    const { rows } = await client.query<{ id: number }>(
      `SELECT id FROM buildings WHERE building_name = 'E2E Test Hall' LIMIT 1`,
    );
    buildingId = rows[0]?.id ?? 0;
    expect(buildingId).toBeGreaterThan(0);
  });

  afterAll(async () => {
    await client?.end();
  });

  /** Room + helpers shared by the room-position refusal tests below. */
  const roomPositionFixture = async () => {
    const { rows: roomRows } = await client.query<{
      id: number;
      version: number;
    }>(`SELECT id, version FROM rooms WHERE room_code = 'E2E-101' LIMIT 1`);
    const roomId = roomRows[0]?.id ?? 0;
    expect(roomId).toBeGreaterThan(0);

    const version = async () => {
      const { rows } = await client.query<{ version: number }>(
        "SELECT version FROM rooms WHERE id = $1",
        [roomId],
      );
      return rows[0]?.version ?? 1;
    };
    const position = async () => {
      const { rows } = await client.query<{ floor: number; source: string }>(
        "SELECT floor, source FROM room_positions WHERE room_id = $1",
        [roomId],
      );
      return rows[0] ?? null;
    };
    const cleanup = () =>
      client.query("DELETE FROM room_positions WHERE room_id = $1", [roomId]);

    return { roomId, version, position, cleanup };
  };

  test("an inferred room position never overwrites a manual one", async () => {
    const { updateRoomPosition, ManualPositionError } = await import(
      "@lib/services/admin-service"
    );
    const { roomId, version, position, cleanup } = await roomPositionFixture();

    try {
      await updateRoomPosition(
        roomId,
        { floor: 2, posX: "1", posY: "2", source: "manual" },
        await version(),
        "e2e-admin",
      );
      const afterManual = await version();

      // Regression (#795 review): the refusal used to `return before`, which the
      // PATCH route answers as `{ success: true, room }` — the editor marked the
      // pin saved and the suggestion disappeared from the list. A refused write
      // has to reach the caller as a failure.
      await expect(
        updateRoomPosition(
          roomId,
          { floor: 5, posX: "9", posY: "9", source: "inferred" },
          afterManual,
          "e2e-admin",
        ),
      ).rejects.toBeInstanceOf(ManualPositionError);

      expect((await position())?.floor).toBe(2);
      expect((await position())?.source).toBe("manual");
      // A refused write must not pretend it happened.
      expect(await version()).toBe(afterManual);
    } finally {
      await cleanup();
    }
  });

  test("a stale inferred write conflicts instead of being silently refused", async () => {
    const { updateRoomPosition, EditConflictError } = await import(
      "@lib/services/admin-service"
    );
    const { roomId, version, position, cleanup } = await roomPositionFixture();

    try {
      await updateRoomPosition(
        roomId,
        { floor: 2, posX: "1", posY: "2", source: "manual" },
        await version(),
        "e2e-admin",
      );
      const afterManual = await version();

      // Regression (#795 review): the manual-position guard used to sit above the
      // version check, so a client working from a stale version got a refusal
      // (HTTP 200) instead of a 409 and never learned it had to reload. Optimistic
      // concurrency has to win over every other refusal.
      await expect(
        updateRoomPosition(
          roomId,
          { floor: 5, posX: "9", posY: "9", source: "inferred" },
          afterManual - 1,
          "e2e-admin",
        ),
      ).rejects.toBeInstanceOf(EditConflictError);

      expect((await position())?.floor).toBe(2);
      expect(await version()).toBe(afterManual);
    } finally {
      await cleanup();
    }
  });

  test("updateBuilding bumps version", async () => {
    const { updateBuilding } = await import("@lib/services/admin-service");
    const before = await client.query<{ version: number; lat: number }>(
      "SELECT version, lat FROM buildings WHERE id = $1",
      [buildingId],
    );
    const version = before.rows[0]?.version ?? 1;
    const lat = (before.rows[0]?.lat ?? 14.165) + 0.0001;
    const updated = await updateBuilding(
      buildingId,
      { lat },
      version,
      "e2e-admin",
    );
    expect(updated?.version).toBe(version + 1);
  });
});

describeIntegration("admin auth integration", () => {
  let client: E2eClient;
  let hasEmailColumn = false;

  beforeAll(async () => {
    const url = integrationDatabaseUrl();
    if (!url) return;
    client = await connectE2eClient(url);
    const { rows } = await client.query<{ exists: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'admin_users'
           AND column_name = 'email'
       ) AS exists`,
    );
    hasEmailColumn = rows[0]?.exists ?? false;
  });

  afterAll(async () => {
    await client?.end();
  });

  test("disabled user cannot authenticate", async () => {
    const { authenticateAdminUser } = await import(
      "@lib/services/admin-user-service"
    );
    const user = await authenticateAdminUser(
      "e2e-disabled",
      integrationPassword(),
    );
    expect(user).toBeNull();
  });

  test("admin user authenticates", async () => {
    const { authenticateAdminUser } = await import(
      "@lib/services/admin-user-service"
    );
    const user = await authenticateAdminUser(
      "e2e-admin",
      integrationPassword(),
    );
    expect(user?.username).toBe("e2e-admin");
  });

  test("admin user authenticates by email when email column exists", async () => {
    if (!hasEmailColumn) return;

    const testEmail = "e2e-admin-login@room-tba.test";
    await client.query(
      `UPDATE admin_users SET email = $1 WHERE username = 'e2e-admin'`,
      [testEmail],
    );
    // Only a confirmed address is a login handle (the password is still
    // required), so confirm it the way the emailed link would.
    await client.query(
      `INSERT INTO admin_user_auth (user_id, verified_email, email_verified_at)
       SELECT id, $1, now() FROM admin_users WHERE username = 'e2e-admin'
       ON CONFLICT (user_id) DO UPDATE
         SET verified_email = EXCLUDED.verified_email,
             email_verified_at = EXCLUDED.email_verified_at`,
      [testEmail],
    );

    try {
      const { authenticateAdminUser } = await import(
        "@lib/services/admin-user-service"
      );
      const user = await authenticateAdminUser(
        testEmail,
        integrationPassword(),
      );
      expect(user?.username).toBe("e2e-admin");
    } finally {
      await client.query(
        `UPDATE admin_users SET email = NULL WHERE username = 'e2e-admin'`,
      );
      await client.query(
        `DELETE FROM admin_user_auth
         WHERE user_id = (SELECT id FROM admin_users WHERE username = 'e2e-admin')`,
      );
    }
  });
});
