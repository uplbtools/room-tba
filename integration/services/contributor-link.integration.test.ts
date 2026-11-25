import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { connectE2eClient, type E2eClient } from "../../scripts/e2e-schema";
import { integrationDatabaseUrl, skipWithoutE2eDb } from "../helpers/env";

const describeIntegration = skipWithoutE2eDb() ? describe.skip : describe;

const GOOGLE_SUB_NEW = "google-sub-new-12345";
const GOOGLE_SUB_LINK = "google-sub-link-67890";
const EMAIL_NEW = "e2e-google-new@example.com";
const EMAIL_LINK = "e2e-google-link@example.com";

describeIntegration("linkOrCreateContributorFromGoogle (#456)", () => {
  let client: E2eClient;

  const cleanup = async () => {
    await client.query("DELETE FROM admin_users WHERE email IN ($1, $2)", [
      EMAIL_NEW,
      EMAIL_LINK,
    ]);
  };

  beforeAll(async () => {
    const url = integrationDatabaseUrl();
    if (!url) return;
    client = await connectE2eClient(url);
    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
    await client?.end();
  });

  test("creates a contributor account for a new Google user", async () => {
    const { linkOrCreateContributorFromGoogle } = await import(
      "@lib/services/admin-user-service"
    );
    const user = await linkOrCreateContributorFromGoogle({
      sub: GOOGLE_SUB_NEW,
      email: EMAIL_NEW,
      emailVerified: true,
      name: "E2E Google User",
    });
    expect(user).not.toBeNull();
    expect(user?.role).toBe("contributor");
    expect(user?.displayName).toBe("E2E Google User");

    const { rows } = await client.query(
      "SELECT role, email, supabase_user_id FROM admin_users WHERE email = $1",
      [EMAIL_NEW],
    );
    expect(rows[0]?.role).toBe("contributor");
    expect(rows[0]?.email).toBe(EMAIL_NEW);
  });

  test("returning Google user resolves to the same account", async () => {
    const { linkOrCreateContributorFromGoogle } = await import(
      "@lib/services/admin-user-service"
    );
    const first = await linkOrCreateContributorFromGoogle({
      sub: GOOGLE_SUB_NEW,
      email: EMAIL_NEW,
      emailVerified: true,
    });
    const second = await linkOrCreateContributorFromGoogle({
      sub: GOOGLE_SUB_NEW,
      email: EMAIL_NEW,
      emailVerified: true,
    });
    expect(second?.id).toBe(first?.id ?? -1);
  });

  test("an existing account whose email is NOT verified is never linked (pre-claim)", async () => {
    const claimId = "00000000-0000-4000-8000-00000000e2e4";
    const claimEmail = "e2e-google-preclaim@example.com";
    await client.query(
      "DELETE FROM admin_users WHERE email = $1 OR supabase_user_id = $2 OR username LIKE 'e2e-google-preclaim%'",
      [claimEmail, claimId],
    );
    // An attacker signed up first, typing the victim's address (never confirmed).
    await client.query(
      `INSERT INTO admin_users (username, display_name, password_hash, role, email, is_active)
       VALUES ('e2e-google-preclaim-attacker', 'Attacker', 'x', 'contributor', $1, true)`,
      [claimEmail],
    );
    const { linkOrCreateContributorFromGoogle } = await import(
      "@lib/services/admin-user-service"
    );
    try {
      // The real owner signs in with Google (provider-confirmed address).
      const user = await linkOrCreateContributorFromGoogle({
        sub: GOOGLE_SUB_LINK,
        email: claimEmail,
        emailVerified: true,
      });
      expect(user).not.toBeNull();
      expect(user?.username).not.toBe("e2e-google-preclaim-attacker");
      const attacker = await client.query(
        "SELECT supabase_user_id, email FROM admin_users WHERE username = 'e2e-google-preclaim-attacker'",
      );
      expect(attacker.rows[0]?.supabase_user_id).toBeNull();
      // The squatter never confirmed the address, so it lost it to the owner.
      expect(attacker.rows[0]?.email).toBeNull();
      const owner = await client.query(
        "SELECT email FROM admin_users WHERE email = $1",
        [claimEmail],
      );
      expect(owner.rows[0]?.email).toBe(claimEmail);
    } finally {
      await client.query(
        "DELETE FROM admin_users WHERE email = $1 OR username LIKE 'e2e-google-preclaim%'",
        [claimEmail],
      );
    }
  });

  test("links an existing account by verified email without a supabase id", async () => {
    const { rows: inserted } = await client.query<{ id: number }>(
      `INSERT INTO admin_users (username, display_name, password_hash, role, email, is_active)
       VALUES ('e2e-google-link', 'Link Me', 'x', 'editor', $1, true) RETURNING id`,
      [EMAIL_LINK],
    );
    await client.query(
      `INSERT INTO admin_user_auth (user_id, verified_email, email_verified_at)
       VALUES ($1, $2, now())`,
      [inserted[0]!.id, EMAIL_LINK],
    );
    const { linkOrCreateContributorFromGoogle } = await import(
      "@lib/services/admin-user-service"
    );
    const user = await linkOrCreateContributorFromGoogle({
      sub: GOOGLE_SUB_LINK,
      email: EMAIL_LINK.toUpperCase(),
      emailVerified: true,
    });
    expect(user?.username).toBe("e2e-google-link");
    expect(user?.role).toBe("editor");

    const { rows } = await client.query(
      "SELECT supabase_user_id FROM admin_users WHERE email = $1",
      [EMAIL_LINK],
    );
    expect(rows[0]?.supabase_user_id).not.toBeNull();
  });

  test("unverified email never links to an existing account nor gets stored", async () => {
    const unverifiedSub = "google-sub-unverified-12345";
    const existingEmail = "e2e-google-unverified@example.com";
    await client.query(
      `DELETE FROM admin_users WHERE email = $1 OR username LIKE 'e2e-google-unverified%'`,
      [existingEmail],
    );
    await client.query(
      `INSERT INTO admin_users (username, display_name, password_hash, role, email, is_active)
       VALUES ('e2e-google-unverified-victim', 'Victim Admin', 'x', 'admin', $1, true)`,
      [existingEmail],
    );
    const { linkOrCreateContributorFromGoogle } = await import(
      "@lib/services/admin-user-service"
    );
    try {
      const user = await linkOrCreateContributorFromGoogle({
        sub: unverifiedSub,
        email: existingEmail,
        emailVerified: false,
      });
      // Must NOT resolve to the existing admin row.
      expect(user?.role).toBe("contributor");
      expect(user?.username).not.toBe("e2e-google-unverified-victim");

      const { rows } = await client.query(
        "SELECT email, supabase_user_id FROM admin_users WHERE email = $1",
        [existingEmail],
      );
      // New account stores no unverified email.
      expect(rows[0]?.email).toBeNull();

      const victim = await client.query(
        `SELECT supabase_user_id FROM admin_users WHERE username = 'e2e-google-unverified-victim'`,
      );
      expect(victim.rows[0]?.supabase_user_id).toBeNull();
    } finally {
      await client.query(
        `DELETE FROM admin_users WHERE email = $1 OR username LIKE 'e2e-google-unverified%'`,
        [existingEmail],
      );
    }
  });
});
