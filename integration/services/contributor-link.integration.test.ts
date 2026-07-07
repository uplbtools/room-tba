import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import pg from "pg";
import { integrationDatabaseUrl, skipWithoutE2eDb } from "../helpers/env";

const describeIntegration = skipWithoutE2eDb() ? describe.skip : describe;

const SUPABASE_ID_NEW = "00000000-0000-4000-8000-00000000e2e1";
const SUPABASE_ID_LINK = "00000000-0000-4000-8000-00000000e2e2";
const EMAIL_NEW = "e2e-google-new@example.com";
const EMAIL_LINK = "e2e-google-link@example.com";

describeIntegration("linkOrCreateContributorFromSupabase (#456)", () => {
  let client: pg.Client;

  const cleanup = async () => {
    await client.query(
      "DELETE FROM admin_users WHERE email IN ($1, $2) OR supabase_user_id IN ($3, $4)",
      [EMAIL_NEW, EMAIL_LINK, SUPABASE_ID_NEW, SUPABASE_ID_LINK],
    );
  };

  beforeAll(async () => {
    const url = integrationDatabaseUrl();
    if (!url) return;
    client = new pg.Client({ connectionString: url });
    await client.connect();
    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
    await client?.end();
  });

  test("creates a contributor account for a new Google user", async () => {
    const { linkOrCreateContributorFromSupabase } = await import(
      "@lib/services/admin-user-service"
    );
    const user = await linkOrCreateContributorFromSupabase({
      id: SUPABASE_ID_NEW,
      email: EMAIL_NEW,
      name: "E2E Google User",
    });
    expect(user).not.toBeNull();
    expect(user?.role).toBe("contributor");
    expect(user?.displayName).toBe("E2E Google User");

    const { rows } = await client.query(
      "SELECT role, email, supabase_user_id FROM admin_users WHERE supabase_user_id = $1",
      [SUPABASE_ID_NEW],
    );
    expect(rows[0]?.role).toBe("contributor");
    expect(rows[0]?.email).toBe(EMAIL_NEW);
  });

  test("returning Google user resolves to the same account", async () => {
    const { linkOrCreateContributorFromSupabase } = await import(
      "@lib/services/admin-user-service"
    );
    const first = await linkOrCreateContributorFromSupabase({
      id: SUPABASE_ID_NEW,
      email: EMAIL_NEW,
    });
    const second = await linkOrCreateContributorFromSupabase({
      id: SUPABASE_ID_NEW,
      email: EMAIL_NEW,
    });
    expect(second?.id).toBe(first?.id ?? -1);
  });

  test("links an existing account by email without a supabase id", async () => {
    await client.query(
      `INSERT INTO admin_users (username, display_name, password_hash, role, email, is_active)
       VALUES ('e2e-google-link', 'Link Me', 'x', 'editor', $1, true)`,
      [EMAIL_LINK],
    );
    const { linkOrCreateContributorFromSupabase } = await import(
      "@lib/services/admin-user-service"
    );
    const user = await linkOrCreateContributorFromSupabase({
      id: SUPABASE_ID_LINK,
      email: EMAIL_LINK.toUpperCase(),
    });
    expect(user?.username).toBe("e2e-google-link");
    expect(user?.role).toBe("editor");

    const { rows } = await client.query(
      "SELECT supabase_user_id FROM admin_users WHERE email = $1",
      [EMAIL_LINK],
    );
    expect(rows[0]?.supabase_user_id).toBe(SUPABASE_ID_LINK);
  });
});
