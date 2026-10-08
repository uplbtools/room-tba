import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";
import bcrypt from "bcrypt";
import { connectE2eClient, type E2eClient } from "../../scripts/e2e-schema";
import { integrationDatabaseUrl, skipWithoutE2eDb } from "../helpers/env";

/**
 * Security audit items 1, 2, 5 and 9 against a real Postgres: session
 * revocation, email verification, the shared rate-limit store and anonymous
 * proposal ownership tokens.
 */
const describeIntegration = skipWithoutE2eDb() ? describe.skip : describe;

const PREFIX = "e2e-authsec";
const PASSWORD = "e2e-authsec-password-123";

describeIntegration("auth security (audit items 1, 2, 5, 9)", () => {
  let client: E2eClient;
  let userId: number;

  const cleanup = async () => {
    await client.query(
      "DELETE FROM edit_proposals WHERE submitter_name LIKE $1 OR submitter_user_id IN (SELECT id FROM admin_users WHERE username LIKE $1)",
      [`${PREFIX}%`],
    );
    await client.query("DELETE FROM admin_users WHERE username LIKE $1", [
      `${PREFIX}%`,
    ]);
  };

  beforeAll(async () => {
    const url = integrationDatabaseUrl();
    if (!url) return;
    client = await connectE2eClient(url);
  });

  afterAll(async () => {
    await cleanup();
    await client?.end();
  });

  beforeEach(async () => {
    await cleanup();
    const hash = await bcrypt.hash(PASSWORD, 4);
    const { rows } = await client.query<{ id: number }>(
      `INSERT INTO admin_users (username, display_name, password_hash, role, email, is_active)
       VALUES ($1, 'Auth Sec', $2, 'editor', $3, true) RETURNING id`,
      [`${PREFIX}-user`, hash, `${PREFIX}-user@example.com`],
    );
    userId = rows[0]!.id;
  });

  async function sessionFor(id: number) {
    const { readSessionVersion } = await import(
      "@lib/services/account-security"
    );
    return {
      id,
      username: `${PREFIX}-user`,
      displayName: "Auth Sec",
      role: "editor" as const,
      sessionVersion: await readSessionVersion(id),
    };
  }

  describe("revocable sessions", () => {
    test("sign out of all devices revokes cookies issued before", async () => {
      const { revalidateSession } = await import("@lib/admin/require-editor");
      const { signOutEverywhere } = await import(
        "@lib/services/admin-user-service"
      );
      const before = await sessionFor(userId);
      expect(await revalidateSession(before)).not.toBeNull();

      await signOutEverywhere(userId);
      expect(await revalidateSession(before)).toBeNull();
      // A cookie minted after the bump works.
      expect(await revalidateSession(await sessionFor(userId))).not.toBeNull();
    });

    test("password change revokes old sessions and returns the new version", async () => {
      const { revalidateSession } = await import("@lib/admin/require-editor");
      const { changePassword } = await import(
        "@lib/services/admin-user-service"
      );
      const before = await sessionFor(userId);
      const version = await changePassword(
        userId,
        PASSWORD,
        "a-brand-new-password-1",
      );
      expect(await revalidateSession(before)).toBeNull();
      expect(
        await revalidateSession({ ...before, sessionVersion: version }),
      ).not.toBeNull();
    });

    test("role change and deactivation revoke sessions", async () => {
      const { revalidateSession } = await import("@lib/admin/require-editor");
      const { updateManagedUser } = await import(
        "@lib/services/admin-user-service"
      );
      const before = await sessionFor(userId);
      await updateManagedUser(userId, { role: "contributor" });
      expect(await revalidateSession(before)).toBeNull();

      const afterRole = await sessionFor(userId);
      await updateManagedUser(userId, { isActive: false });
      expect(await revalidateSession(afterRole)).toBeNull();
    });

    test("password reset revokes old sessions", async () => {
      const { revalidateSession } = await import("@lib/admin/require-editor");
      const { createSignedToken } = await import("@lib/admin/signed-token");
      const { confirmPasswordReset } = await import(
        "@lib/services/admin-user-service"
      );
      const { createHash } = await import("node:crypto");
      const { rows } = await client.query<{ password_hash: string }>(
        "SELECT password_hash FROM admin_users WHERE id = $1",
        [userId],
      );
      const pwFp = createHash("sha256")
        .update(rows[0]!.password_hash)
        .digest("hex")
        .slice(0, 16);
      const token = createSignedToken(
        { purpose: "password-reset", userId, pwFp },
        600,
      );
      const before = await sessionFor(userId);
      await confirmPasswordReset(token, "reset-password-value-9");
      expect(await revalidateSession(before)).toBeNull();
    });
  });

  describe("email verification", () => {
    test("signup email starts unverified and the signed link verifies it once", async () => {
      const { createContributorAccount, getAccountProfile, verifyEmailToken } =
        await import("@lib/services/admin-user-service");
      const { createSignedToken } = await import("@lib/admin/signed-token");
      const email = `${PREFIX}-new@example.com`;
      const user = await createContributorAccount({
        username: `${PREFIX}-new`,
        password: PASSWORD,
        email,
        displayName: null,
      });
      expect(user.role).toBe("contributor");
      expect((await getAccountProfile(user.id))?.emailVerified).toBe(false);

      const token = createSignedToken(
        { purpose: "email-verify", userId: user.id, email },
        600,
      );
      await verifyEmailToken(token);
      expect((await getAccountProfile(user.id))?.emailVerified).toBe(true);
      // Single use.
      await expect(verifyEmailToken(token)).rejects.toThrow();
    });

    test("a verification link for an old address does nothing after an email change", async () => {
      const { verifyEmailToken, getAccountProfile } = await import(
        "@lib/services/admin-user-service"
      );
      const { createSignedToken } = await import("@lib/admin/signed-token");
      const token = createSignedToken(
        { purpose: "email-verify", userId, email: "someone-else@example.com" },
        600,
      );
      await expect(verifyEmailToken(token)).rejects.toThrow();
      expect((await getAccountProfile(userId))?.emailVerified).toBe(false);
    });

    test("signing up with someone's verified email does not attach it", async () => {
      const { createContributorAccount } = await import(
        "@lib/services/admin-user-service"
      );
      await client.query(
        "INSERT INTO admin_user_auth (user_id, verified_email, email_verified_at) VALUES ($1, $2, now())",
        [userId, `${PREFIX}-user@example.com`],
      );
      const copycat = await createContributorAccount({
        username: `${PREFIX}-copycat`,
        password: PASSWORD,
        email: `${PREFIX}-USER@example.com`,
        displayName: null,
      });
      expect(copycat.email).toBeNull();
    });

    test("an unconfirmed holder gives the address up to a confirmed email change", async () => {
      const {
        createContributorAccount,
        confirmEmailChange,
        getAccountProfile,
      } = await import("@lib/services/admin-user-service");
      const { createSignedToken } = await import("@lib/admin/signed-token");
      // userId typed this address but never confirmed it.
      const owner = await createContributorAccount({
        username: `${PREFIX}-owner`,
        password: PASSWORD,
        email: null,
        displayName: null,
      });
      const token = createSignedToken(
        {
          purpose: "email-change",
          userId: owner.id,
          newEmail: `${PREFIX}-user@example.com`,
          fromEmail: null,
        },
        600,
      );
      await confirmEmailChange(token);
      const profile = await getAccountProfile(owner.id);
      expect(profile?.email).toBe(`${PREFIX}-user@example.com`);
      expect(profile?.emailVerified).toBe(true);
      expect((await getAccountProfile(userId))?.email).toBeNull();
    });

    test("a taken username gets the generic message", async () => {
      const { createContributorAccount, AccountActionError } = await import(
        "@lib/services/admin-user-service"
      );
      const { SIGNUP_UNAVAILABLE_MESSAGE } = await import(
        "@lib/auth/email-verification"
      );
      const attempt = createContributorAccount({
        username: `${PREFIX}-user`,
        password: PASSWORD,
        email: null,
        displayName: null,
      });
      await expect(attempt).rejects.toBeInstanceOf(AccountActionError);
      await expect(attempt).rejects.toThrow(SIGNUP_UNAVAILABLE_MESSAGE);
    });

    test("reset mail only goes to a verified address, and email login needs one", async () => {
      const { requestPasswordReset, authenticateAdminUser } = await import(
        "@lib/services/admin-user-service"
      );
      const email = `${PREFIX}-user@example.com`;
      // Unverified: silently no mail (resolves without trying to send).
      await requestPasswordReset(email);
      await requestPasswordReset(`${PREFIX}-user`);
      expect(await authenticateAdminUser(email, PASSWORD)).toBeNull();

      await client.query(
        "INSERT INTO admin_user_auth (user_id, verified_email, email_verified_at) VALUES ($1, $2, now())",
        [userId, email],
      );
      // Verified: it now tries to send, which fails here only because the
      // harness has no Resend key.
      await expect(requestPasswordReset(email)).rejects.toThrow(/Resend/);
      expect((await authenticateAdminUser(email, PASSWORD))?.id).toBe(userId);
    });
  });

  describe("shared rate-limit store", () => {
    test("counts hits in a fixed window across callers and stores hashed keys", async () => {
      const { postgresRateLimitStore, sharedRateLimit } = await import(
        "@lib/api/rate-limit-db"
      );
      const key = `${PREFIX}:ip:203.0.113.9:${Date.now()}`;
      expect((await sharedRateLimit(key, 2, 60_000)).allowed).toBe(true);
      expect((await sharedRateLimit(key, 2, 60_000)).allowed).toBe(true);
      expect((await sharedRateLimit(key, 2, 60_000)).allowed).toBe(false);

      const { rows } = await client.query(
        "SELECT key FROM rate_limits WHERE key LIKE $1",
        ["%203.0.113.9%"],
      );
      expect(rows).toHaveLength(0);

      const short = `${PREFIX}:short:${Date.now()}`;
      await postgresRateLimitStore.hit(short, 1);
      await Bun.sleep(5);
      expect((await postgresRateLimitStore.hit(short, 1)).count).toBe(1);
    });

    test("account backoff locks after repeated failures and clears", async () => {
      const { accountBackoff } = await import("@lib/api/rate-limit-db");
      const { ACCOUNT_BACKOFF_FREE_FAILURES } = await import(
        "@lib/api/rate-limit-shared"
      );
      const key = `${PREFIX}:backoff:${Date.now()}`;
      for (let i = 0; i < ACCOUNT_BACKOFF_FREE_FAILURES; i += 1) {
        await accountBackoff.fail(key);
      }
      expect(await accountBackoff.check(key)).not.toBeNull();
      await accountBackoff.succeed(key);
      expect(await accountBackoff.check(key)).toBeNull();
    });
  });

  describe("anonymous proposal ownership", () => {
    async function roomVersion() {
      const { rows } = await client.query<{ version: number }>(
        "SELECT version FROM rooms WHERE id = 1",
      );
      return rows[0]!.version;
    }

    test("submit returns a token; only that token withdraws", async () => {
      const { submitProposal, withdrawProposal } = await import(
        "@lib/services/proposal-service"
      );
      const proposal = await submitProposal({
        entityType: "room",
        entityId: 1,
        baseVersion: await roomVersion(),
        patch: { directions: `${PREFIX} anon` },
        submitterName: `${PREFIX} Anon`,
        submitterUserId: null,
        proposalId: null,
      });
      expect(proposal.withdrawToken).toMatch(/^[A-Za-z0-9_-]{43}$/);

      // The display name proves nothing any more.
      await expect(
        withdrawProposal(proposal.id, null, `${PREFIX} Anon`),
      ).rejects.toThrow(/Not allowed/);
      const withdrawn = await withdrawProposal(
        proposal.id,
        null,
        proposal.withdrawToken,
      );
      expect(withdrawn.status).toBe("withdrawn");
    });

    test("revising anonymously needs the token, else it starts a new proposal", async () => {
      const { submitProposal } = await import("@lib/services/proposal-service");
      const base = {
        entityType: "room",
        entityId: 1,
        baseVersion: await roomVersion(),
        submitterName: `${PREFIX} Reviser`,
        submitterUserId: null,
      };
      const first = await submitProposal({
        ...base,
        patch: { directions: `${PREFIX} v1` },
        proposalId: null,
      });
      const hijack = await submitProposal({
        ...base,
        patch: { directions: `${PREFIX} hijack` },
        proposalId: first.id,
      });
      expect(hijack.id).not.toBe(first.id);

      const revised = await submitProposal({
        ...base,
        patch: { directions: `${PREFIX} v2` },
        proposalId: first.id,
        proposalToken: first.withdrawToken,
      });
      expect(revised.id).toBe(first.id);
      expect(revised.proposedPatch).toMatchObject({
        directions: `${PREFIX} v2`,
      });
    });
  });
});
