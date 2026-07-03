import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import pg from "pg";
import {
  integrationDatabaseUrl,
  integrationPassword,
  skipWithoutE2eDb,
} from "../helpers/env";

const describeIntegration = skipWithoutE2eDb() ? describe.skip : describe;

describeIntegration("admin building service integration", () => {
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

  test("updateBuilding bumps version", async () => {
    const { updateBuilding } = await import("@lib/services/admin-service");
    const before = await client.query<{ version: number; lat: number }>(
      `SELECT version, lat FROM buildings WHERE id = $1`,
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
  let client: pg.Client;
  let hasEmailColumn = false;

  beforeAll(async () => {
    const url = integrationDatabaseUrl();
    if (!url) return;
    client = new pg.Client({ connectionString: url });
    await client.connect();
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
    const { authenticateAdminUser } =
      await import("@lib/services/admin-user-service");
    const user = await authenticateAdminUser(
      "e2e-disabled",
      integrationPassword(),
    );
    expect(user).toBeNull();
  });

  test("admin user authenticates", async () => {
    const { authenticateAdminUser } =
      await import("@lib/services/admin-user-service");
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

    try {
      const { authenticateAdminUser } =
        await import("@lib/services/admin-user-service");
      const user = await authenticateAdminUser(
        testEmail,
        integrationPassword(),
      );
      expect(user?.username).toBe("e2e-admin");
    } finally {
      await client.query(
        `UPDATE admin_users SET email = NULL WHERE username = 'e2e-admin'`,
      );
    }
  });
});
