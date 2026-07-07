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
      `DELETE FROM admin_users WHERE email IN ($1, $2) OR supabase_user_id IN ($3, $4)`,
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
      emailConfirmed: true,
      name: "E2E Google User",
    });
    expect(user).not.toBeNull();
    expect(user?.role).toBe("contributor");
    expect(user?.displayName).toBe("E2E Google User");

    const { rows } = await client.query(
      `SELECT role, email, supabase_user_id FROM admin_users WHERE supabase_user_id = $1`,
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
      emailConfirmed: true,
    });
    const second = await linkOrCreateContributorFromSupabase({
      id: SUPABASE_ID_NEW,
      email: EMAIL_NEW,
      emailConfirmed: true,
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
      emailConfirmed: true,
    });
    expect(user?.username).toBe("e2e-google-link");
    expect(user?.role).toBe("editor");

    const { rows } = await client.query(
      `SELECT supabase_user_id FROM admin_users WHERE email = $1`,
      [EMAIL_LINK],
    );
    expect(rows[0]?.supabase_user_id).toBe(SUPABASE_ID_LINK);
  });

  test("unverified email never links to an existing account nor gets stored", async () => {
    const unverifiedId = "00000000-0000-4000-8000-00000000e2e3";
    const existingEmail = "e2e-google-unverified@example.com";
    await client.query(
      `DELETE FROM admin_users WHERE email = $1 OR supabase_user_id = $2 OR username LIKE 'e2e-google-unverified%'`,
      [existingEmail, unverifiedId],
    );
    await client.query(
      `INSERT INTO admin_users (username, display_name, password_hash, role, email, is_active)
       VALUES ('e2e-google-unverified-victim', 'Victim Admin', 'x', 'admin', $1, true)`,
      [existingEmail],
    );
    const { linkOrCreateContributorFromSupabase } = await import(
      "@lib/services/admin-user-service"
    );
    try {
      const user = await linkOrCreateContributorFromSupabase({
        id: unverifiedId,
        email: existingEmail,
        emailConfirmed: false,
      });
      // Must NOT resolve to the existing admin row.
      expect(user?.role).toBe("contributor");
      expect(user?.username).not.toBe("e2e-google-unverified-victim");

      const { rows } = await client.query(
        `SELECT email, supabase_user_id FROM admin_users WHERE supabase_user_id = $1`,
        [unverifiedId],
      );
      // New account stores no unverified email.
      expect(rows[0]?.email).toBeNull();

      const victim = await client.query(
        `SELECT supabase_user_id FROM admin_users WHERE username = 'e2e-google-unverified-victim'`,
      );
      expect(victim.rows[0]?.supabase_user_id).toBeNull();
    } finally {
      await client.query(
        `DELETE FROM admin_users WHERE email = $1 OR supabase_user_id = $2 OR username LIKE 'e2e-google-unverified%'`,
        [existingEmail, unverifiedId],
      );
    }
  });
});
