import {
  describe,
  expect,
  test,
  beforeAll,
  afterAll,
  beforeEach,
} from "bun:test";
import pg from "pg";
import bcrypt from "bcrypt";
import { integrationDatabaseUrl, skipWithoutE2eDb } from "../helpers/env";

const describeIntegration = skipWithoutE2eDb() ? describe.skip : describe;

const PREFIX = "e2e-account-mgmt";
const PASSWORD = "e2e-test-password-12345";

describeIntegration(
  "account management service integration (#456/#272 follow-up)",
  () => {
    let client: pg.Client;
    let passwordUserId: number;
    let oauthUserId: number;

    const cleanup = async () => {
      // Delete dependent rows first — if an earlier test's own inline
      // cleanup didn't run (e.g. an assertion above it threw), a leftover
      // edit_proposals/contributions row would otherwise block every
      // subsequent DELETE FROM admin_users via the FK constraint.
      await client.query(
        "DELETE FROM edit_proposals WHERE submitter_user_id IN (SELECT id FROM admin_users WHERE username LIKE $1)",
        [`${PREFIX}%`],
      );
      await client.query(
        "DELETE FROM contributions WHERE user_id IN (SELECT id FROM admin_users WHERE username LIKE $1)",
        [`${PREFIX}%`],
      );
      await client.query("DELETE FROM admin_users WHERE username LIKE $1", [
        `${PREFIX}%`,
      ]);
    };

    beforeAll(async () => {
      const url = integrationDatabaseUrl();
      if (!url) return;
      client = new pg.Client({ connectionString: url });
      await client.connect();
    });

    afterAll(async () => {
      await cleanup();
      await client?.end();
    });

    beforeEach(async () => {
      await cleanup();
      const passwordHash = await bcrypt.hash(PASSWORD, 12);
      const { rows: passwordRows } = await client.query<{ id: number }>(
        `INSERT INTO admin_users (username, display_name, password_hash, role, email, is_active)
       VALUES ($1, 'Password User', $2, 'editor', $3, true) RETURNING id`,
        [`${PREFIX}-password`, passwordHash, `${PREFIX}-password@example.com`],
      );
      passwordUserId = passwordRows[0]!.id;

      const { rows: oauthRows } = await client.query<{ id: number }>(
        `INSERT INTO admin_users (username, display_name, password_hash, role, email, is_active, supabase_user_id)
       VALUES ($1, 'OAuth User', '', 'contributor', $2, true, $3) RETURNING id`,
        [
          `${PREFIX}-oauth`,
          `${PREFIX}-oauth@example.com`,
          "00000000-0000-4000-8000-0000000000e1",
        ],
      );
      oauthUserId = oauthRows[0]!.id;
    });

    test("changePassword rejects wrong current password", async () => {
      const { changePassword, AccountActionError } = await import(
        "@lib/services/admin-user-service"
      );
      await expect(
        changePassword(passwordUserId, "wrong-password", "a-new-password-123"),
      ).rejects.toBeInstanceOf(AccountActionError);
    });

    test("changePassword succeeds with correct current password", async () => {
      const { changePassword } = await import(
        "@lib/services/admin-user-service"
      );
      await changePassword(passwordUserId, PASSWORD, "a-new-password-123");
      const { rows } = await client.query<{ password_hash: string }>(
        "SELECT password_hash FROM admin_users WHERE id = $1",
        [passwordUserId],
      );
      expect(
        await bcrypt.compare("a-new-password-123", rows[0]!.password_hash),
      ).toBe(true);
    });

    test("changePassword skips the current-password check for OAuth-only accounts", async () => {
      const { changePassword } = await import(
        "@lib/services/admin-user-service"
      );
      await changePassword(oauthUserId, null, "first-password-123");
      const { rows } = await client.query<{ password_hash: string }>(
        "SELECT password_hash FROM admin_users WHERE id = $1",
        [oauthUserId],
      );
      expect(rows[0]!.password_hash).not.toBe("");
    });

    test("changePassword enforces a minimum length", async () => {
      const { changePassword, AccountActionError } = await import(
        "@lib/services/admin-user-service"
      );
      await expect(
        changePassword(passwordUserId, PASSWORD, "short"),
      ).rejects.toBeInstanceOf(AccountActionError);
    });

    test("email-change token round-trip updates the email", async () => {
      const { requestEmailChange, confirmEmailChange } = await import(
        "@lib/services/admin-user-service"
      );
      const { createSignedToken } = await import("@lib/admin/signed-token");
      const newEmail = `${PREFIX}-new@example.com`;

      // requestEmailChange sends via Resend (unconfigured in tests) — assert it
      // validates instead of relying on the network call succeeding.
      await expect(
        requestEmailChange(passwordUserId, "not-an-email"),
      ).rejects.toThrow();

      const token = createSignedToken(
        {
          purpose: "email-change",
          userId: passwordUserId,
          newEmail,
          fromEmail: `${PREFIX}-password@example.com`,
        },
        60,
      );
      await confirmEmailChange(token);
      const { rows } = await client.query<{ email: string }>(
        "SELECT email FROM admin_users WHERE id = $1",
        [passwordUserId],
      );
      expect(rows[0]!.email).toBe(newEmail);
    });

    test("email-change token is single-use (replay rejected after apply)", async () => {
      const { confirmEmailChange, AccountActionError } = await import(
        "@lib/services/admin-user-service"
      );
      const { createSignedToken } = await import("@lib/admin/signed-token");
      const token = createSignedToken(
        {
          purpose: "email-change",
          userId: passwordUserId,
          newEmail: `${PREFIX}-replayed@example.com`,
          fromEmail: `${PREFIX}-password@example.com`,
        },
        60,
      );
      await confirmEmailChange(token);
      // Email no longer matches fromEmail — the same token must now die.
      await expect(confirmEmailChange(token)).rejects.toBeInstanceOf(
        AccountActionError,
      );
    });

    test("an email-change token cannot reset a password (purpose confusion)", async () => {
      const { confirmPasswordReset, AccountActionError } = await import(
        "@lib/services/admin-user-service"
      );
      const { createSignedToken } = await import("@lib/admin/signed-token");
      // Both token kinds share the HMAC secret; only `purpose` separates
      // them. This was exploitable before the purpose check existed.
      const emailChangeToken = createSignedToken(
        {
          purpose: "email-change",
          userId: passwordUserId,
          newEmail: `${PREFIX}-evil@example.com`,
          fromEmail: `${PREFIX}-password@example.com`,
        },
        60,
      );
      await expect(
        confirmPasswordReset(emailChangeToken, "attacker-password-123"),
      ).rejects.toBeInstanceOf(AccountActionError);
      // Legacy shape without purpose must also be rejected.
      const legacyToken = createSignedToken({ userId: passwordUserId }, 60);
      await expect(
        confirmPasswordReset(legacyToken, "attacker-password-123"),
      ).rejects.toBeInstanceOf(AccountActionError);
    });

    test("password-reset token is single-use (fingerprint invalidated by the reset)", async () => {
      const { confirmPasswordReset, AccountActionError } = await import(
        "@lib/services/admin-user-service"
      );
      const { createSignedToken } = await import("@lib/admin/signed-token");
      const { createHash } = await import("node:crypto");

      const { rows } = await client.query<{ password_hash: string }>(
        "SELECT password_hash FROM admin_users WHERE id = $1",
        [passwordUserId],
      );
      const pwFp = createHash("sha256")
        .update(rows[0]!.password_hash)
        .digest("hex")
        .slice(0, 16);
      const token = createSignedToken(
        { purpose: "password-reset", userId: passwordUserId, pwFp },
        60,
      );

      await confirmPasswordReset(token, "brand-new-password-123");
      // Hash changed → fingerprint mismatch → replay dies.
      await expect(
        confirmPasswordReset(token, "second-password-456"),
      ).rejects.toBeInstanceOf(AccountActionError);

      const after = await client.query<{ password_hash: string }>(
        "SELECT password_hash FROM admin_users WHERE id = $1",
        [passwordUserId],
      );
      expect(
        await bcrypt.compare(
          "brand-new-password-123",
          after.rows[0]!.password_hash,
        ),
      ).toBe(true);
    });

    test("linkGoogleIdentity rejects an identity already linked to another account", async () => {
      const { linkGoogleIdentity, AccountActionError } = await import(
        "@lib/services/admin-user-service"
      );
      const { rows } = await client.query<{ supabase_user_id: string }>(
        "SELECT supabase_user_id FROM admin_users WHERE id = $1",
        [oauthUserId],
      );
      await expect(
        linkGoogleIdentity(passwordUserId, rows[0]!.supabase_user_id),
      ).rejects.toBeInstanceOf(AccountActionError);
    });

    test("unlinkGoogleIdentity requires a password to already be set", async () => {
      const { unlinkGoogleIdentity, AccountActionError } = await import(
        "@lib/services/admin-user-service"
      );
      await expect(unlinkGoogleIdentity(oauthUserId)).rejects.toBeInstanceOf(
        AccountActionError,
      );
    });

    test("softDeleteAccount scrubs PII and blocks future login", async () => {
      const { softDeleteAccount } = await import(
        "@lib/services/admin-user-service"
      );
      await softDeleteAccount(passwordUserId, PASSWORD);

      const { rows } = await client.query<{
        is_active: boolean;
        email: string | null;
        password_hash: string;
        deleted_at: string | null;
      }>(
        "SELECT is_active, email, password_hash, deleted_at FROM admin_users WHERE id = $1",
        [passwordUserId],
      );
      expect(rows[0]!.is_active).toBe(false);
      expect(rows[0]!.email).toBeNull();
      expect(rows[0]!.password_hash).toBe("");
      expect(rows[0]!.deleted_at).not.toBeNull();

      const { authenticateAdminUser } = await import(
        "@lib/services/admin-user-service"
      );
      const stillLogsIn = await authenticateAdminUser(
        `${PREFIX}-password`,
        PASSWORD,
      );
      expect(stillLogsIn).toBeNull();
    });

    test("softDeleteAccount preserves proposal/contribution FK attribution", async () => {
      const { rows: proposalRows } = await client.query<{ id: number }>(
        `INSERT INTO edit_proposals
         (entity_type, entity_id, status, proposed_patch, base_version, submitter_name, submitter_user_id)
       VALUES ('building', 1, 'pending', '{}'::jsonb, 1, 'Password User', $1)
       RETURNING id`,
        [passwordUserId],
      );

      const { softDeleteAccount } = await import(
        "@lib/services/admin-user-service"
      );
      await softDeleteAccount(passwordUserId, PASSWORD);

      const { rows } = await client.query<{ submitter_user_id: number }>(
        "SELECT submitter_user_id FROM edit_proposals WHERE id = $1",
        [proposalRows[0]!.id],
      );
      expect(rows[0]!.submitter_user_id).toBe(passwordUserId);

      await client.query("DELETE FROM edit_proposals WHERE id = $1", [
        proposalRows[0]!.id,
      ]);
    });

    test("createAdminUser + updateManagedUser role change", async () => {
      const { createAdminUser, updateManagedUser } = await import(
        "@lib/services/admin-user-service"
      );

      const created = await createAdminUser({
        username: `${PREFIX}-newadmin`,
        password: "another-password-123",
        role: "admin",
      });
      expect(created.role).toBe("admin");

      const demoted = await updateManagedUser(created.id, { role: "editor" });
      expect(demoted.role).toBe("editor");

      const promoted = await updateManagedUser(created.id, { role: "admin" });
      expect(promoted.role).toBe("admin");
    });

    test("updateManagedUser blocks demoting the last remaining admin", async () => {
      const { createAdminUser, updateManagedUser, AccountActionError } =
        await import("@lib/services/admin-user-service");

      const created = await createAdminUser({
        username: `${PREFIX}-soleadmin`,
        password: "another-password-123",
        role: "admin",
      });

      // Snapshot every other currently-active admin so the guard sees exactly
      // one admin (`created`); restore each row's exact prior role afterward
      // rather than assuming a fixed shared-fixture layout.
      const { rows: otherAdmins } = await client.query<{
        id: number;
        role: string;
      }>(
        `SELECT id, role FROM admin_users WHERE role = 'admin' AND is_active = true AND id <> $1`,
        [created.id],
      );
      await client.query(
        `UPDATE admin_users SET role = 'contributor' WHERE role = 'admin' AND is_active = true AND id <> $1`,
        [created.id],
      );

      try {
        await expect(
          updateManagedUser(created.id, { role: "editor" }),
        ).rejects.toBeInstanceOf(AccountActionError);
      } finally {
        for (const admin of otherAdmins) {
          await client.query("UPDATE admin_users SET role = $1 WHERE id = $2", [
            admin.role,
            admin.id,
          ]);
        }
      }
    });
  },
);
