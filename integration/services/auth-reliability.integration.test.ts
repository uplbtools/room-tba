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

// A local stand-in for the Discord gateway, so the outbox can deliver for
// real. Set before the notification adapter is first built (it caches).
let gatewayStatus = 200;
const gatewayHits: unknown[] = [];
const gateway = Bun.serve({
  port: 0,
  async fetch(req) {
    gatewayHits.push(await req.json());
    return new Response("{}", { status: gatewayStatus });
  },
});
process.env.NOTIFICATION_GATEWAY_URL = `http://127.0.0.1:${gateway.port}/notifications`;
process.env.NOTIFICATION_INGRESS_SECRET = "integration-secret";

const { recordAudit, listAuditLog } = await import(
  "@lib/services/audit-log-service"
);
const staff = await import("@lib/services/staff-security-service");
const { totp } = await import("@lib/auth/totp");
const invites = await import("@lib/services/staff-invite-service");
const prefs = await import("@lib/services/notification-preferences-service");
const access = await import("@lib/services/access-request-service");
const cron = await import("@lib/services/cron-run-service");
const { enqueueNotification, retryDueNotifications } = await import(
  "@lib/notifications/outbox"
);
const { listReviewQueue, listPendingProposalsForReview } = await import(
  "@lib/services/proposal-service"
);
const { listStaffRecipients } = await import("@lib/services/digest-service");

const describeIntegration = skipWithoutE2eDb() ? describe.skip : describe;
const PREFIX = "e2e-authrel";

describeIntegration("auth reliability and staff security (audit 12 to 20)", () => {
  let client: E2eClient;

  const cleanup = async () => {
    const users = `(SELECT id FROM admin_users WHERE username LIKE '${PREFIX}%')`;
    await client.query(`DELETE FROM edit_proposals WHERE submitter_name LIKE '${PREFIX}%'`);
    await client.query(`DELETE FROM staff_invites WHERE email LIKE '${PREFIX}%'`);
    await client.query(`DELETE FROM editor_access_requests WHERE user_id IN ${users}`);
    await client.query(`DELETE FROM admin_audit_log WHERE actor_label LIKE '${PREFIX}%' OR target_label LIKE '${PREFIX}%'`);
    await client.query(`DELETE FROM notification_outbox WHERE idempotency_key LIKE '${PREFIX}%'`);
    await client.query(`DELETE FROM cron_runs WHERE job LIKE '${PREFIX}%'`);
    await client.query(`DELETE FROM admin_users WHERE username LIKE '${PREFIX}%'`);
  };

  async function makeUser(
    suffix: string,
    role: "admin" | "editor" | "contributor",
    email: string | null = null,
  ) {
    const hash = await bcrypt.hash("integration-password-1", 4);
    const { rows } = await client.query<{ id: number }>(
      `INSERT INTO admin_users (username, display_name, password_hash, role, email, is_active)
       VALUES ($1, $1, $2, $3, $4, true) RETURNING id`,
      [`${PREFIX}-${suffix}`, hash, role, email],
    );
    const id = rows[0]?.id as number;
    return { id, username: `${PREFIX}-${suffix}`, displayName: `${PREFIX}-${suffix}`, role };
  }

  beforeAll(async () => {
    const url = integrationDatabaseUrl();
    if (!url) return;
    client = await connectE2eClient(url);
  });

  afterAll(async () => {
    await cleanup();
    await client?.end();
    gateway.stop(true);
  });

  beforeEach(cleanup);

  test("audit log appends and pages newest first", async () => {
    const admin = await makeUser("auditor", "admin");
    for (const n of [1, 2, 3]) {
      await recordAudit({
        action: "user.role_changed",
        actor: admin,
        targetLabel: `${PREFIX}-target-${n}`,
        detail: { n },
      });
    }
    const first = await listAuditLog({ limit: 2 });
    const mine = first.entries.filter((e) => e.actorLabel === admin.username);
    expect(mine.length).toBeGreaterThan(0);
    expect(first.entries[0]?.id).toBeGreaterThan(first.entries[1]?.id ?? 0);
    expect(first.nextBefore).not.toBeNull();
    const second = await listAuditLog({ before: first.nextBefore, limit: 2 });
    expect(second.entries.every((e) => e.id < (first.nextBefore ?? 0))).toBe(true);
  });

  test("admin 2FA: grace on first sign-in, enrollment, code check, replay refused", async () => {
    const admin = await makeUser("mfa", "admin");
    const first = await staff.loginPlanFor(admin);
    expect(first.steps).toEqual([]);
    expect(first.enrollSuggested).toBe(true);

    const { secret, otpauthUri } = await staff.startMfaEnrollment(admin);
    expect(otpauthUri).toContain("otpauth://totp/");
    const { rows } = await client.query(
      "SELECT totp_secret_enc FROM admin_user_security WHERE user_id = $1",
      [admin.id],
    );
    expect(rows[0]?.totp_secret_enc).not.toContain(secret);

    const codes = await staff.confirmMfaEnrollment(admin.id, totp(secret));
    expect(codes).toHaveLength(10);
    expect((await staff.loginPlanFor(admin)).steps).toEqual(["mfa"]);

    // The enrollment code's step is spent; a code from the next step works.
    const next = totp(secret, Date.now() + 30_000);
    expect(await staff.verifyMfaCode(admin.id, next)).toBe("totp");
    expect(await staff.verifyMfaCode(admin.id, next)).toBeNull();
    expect(await staff.verifyMfaCode(admin.id, codes[0] as string)).toBe("recovery");
    expect(await staff.verifyMfaCode(admin.id, codes[0] as string)).toBeNull();

    // Turning it off makes the next sign-in require enrollment again.
    await staff.disableMfa(admin);
    expect((await staff.loginPlanFor(admin)).steps).toEqual(["enroll_mfa"]);
  });

  test("temporary password forces a change step", async () => {
    const editor = await makeUser("temp", "editor");
    await staff.setMustChangePassword(editor.id, true);
    expect((await staff.loginPlanFor(editor)).steps).toEqual(["change_password"]);
    await staff.setMustChangePassword(editor.id, false);
    expect((await staff.loginPlanFor(editor)).steps).toEqual([]);
  });

  test("staff invite: create, accept once, role and email applied", async () => {
    const admin = await makeUser("inviter", "admin");
    const created = await invites.createStaffInvite({
      email: `${PREFIX}-new@example.ph`,
      role: "editor",
      invitedBy: admin,
    });
    // Resend is unconfigured in integration: the link comes back to share.
    expect(created.emailed).toBe(false);
    const token = new URL(created.inviteUrl as string).searchParams.get("token") as string;
    expect(await invites.findUsableInvite(token)).not.toBeNull();
    expect((await invites.listPendingInvites()).some((i) => i.id === created.invite.id)).toBe(true);

    const user = await invites.acceptStaffInvite({
      token,
      username: `${PREFIX}-invited`,
      password: "integration-password-2",
    });
    expect(user.role).toBe("editor");
    expect(user.email).toBe(`${PREFIX}-new@example.ph`);
    expect(await invites.findUsableInvite(token)).toBeNull();
    await expect(
      invites.acceptStaffInvite({
        token,
        username: `${PREFIX}-invited2`,
        password: "integration-password-2",
      }),
    ).rejects.toThrow(/invalid, used, or expired/);
  });

  test("notification preferences filter digest recipients", async () => {
    const editor = await makeUser("digest", "editor", `${PREFIX}-d@example.ph`);
    expect((await listStaffRecipients("digest")).some((r) => r.id === editor.id)).toBe(true);
    await prefs.unsubscribeFromTopic(editor.id, "digest");
    expect(await prefs.getNotificationPreferences(editor.id)).toEqual({
      digest: false,
      reviewNotices: true,
    });
    expect((await listStaffRecipients("digest")).some((r) => r.id === editor.id)).toBe(false);
    expect(
      (await listStaffRecipients("review_notices")).some((r) => r.id === editor.id),
    ).toBe(true);
  });

  test("editor access request: one pending, approve grants editor", async () => {
    const contributor = await makeUser("asker", "contributor");
    const admin = await makeUser("granter", "admin");
    await access.createAccessRequest(contributor, "I would like to map CAS rooms");
    await expect(
      access.createAccessRequest(contributor, "Another request here please"),
    ).rejects.toThrow(/already have a request/);
    const pending = await access.listPendingAccessRequests();
    const mine = pending.find((r) => r.userId === contributor.id);
    expect(mine).toBeDefined();
    await access.decideAccessRequest(mine?.id as number, "approved", admin);
    const { rows } = await client.query("SELECT role FROM admin_users WHERE id = $1", [
      contributor.id,
    ]);
    expect(rows[0]?.role).toBe("editor");
  });

  test("cron runs: a period is claimed once, failed runs can retry", async () => {
    const job = `${PREFIX}-job`;
    expect(await cron.claimCronRun(job, "2026-10-08")).toBe(true);
    expect(await cron.claimCronRun(job, "2026-10-08")).toBe(false);
    await cron.finishCronRun(job, "2026-10-08", "failed", { error: "x" });
    expect(await cron.claimCronRun(job, "2026-10-08")).toBe(true);
    await cron.finishCronRun(job, "2026-10-08", "done", { ok: true });
    expect(await cron.claimCronRun(job, "2026-10-08")).toBe(false);
  });

  test("outbox: delivers, dedupes by key, retries a failure from cron", async () => {
    const event = (key: string) => ({
      schemaVersion: 1 as const,
      type: "feedback.submitted" as const,
      source: "room-tba" as const,
      occurredAt: new Date().toISOString(),
      idempotencyKey: key,
      payload: { feedbackId: 1 },
    });
    gatewayStatus = 200;
    gatewayHits.length = 0;
    await enqueueNotification(event(`${PREFIX}-ok`));
    await enqueueNotification(event(`${PREFIX}-ok`));
    expect(gatewayHits).toHaveLength(1);
    const sent = await client.query(
      "SELECT status, attempts FROM notification_outbox WHERE idempotency_key = $1",
      [`${PREFIX}-ok`],
    );
    expect(sent.rows[0]).toMatchObject({ status: "sent", attempts: 1 });

    gatewayStatus = 500;
    await enqueueNotification(event(`${PREFIX}-retry`));
    const failed = await client.query(
      "SELECT status, attempts FROM notification_outbox WHERE idempotency_key = $1",
      [`${PREFIX}-retry`],
    );
    expect(failed.rows[0]).toMatchObject({ status: "pending", attempts: 1 });

    gatewayStatus = 200;
    await client.query(
      "UPDATE notification_outbox SET next_attempt_at = now() - interval '1 minute' WHERE idempotency_key = $1",
      [`${PREFIX}-retry`],
    );
    const sweep = await retryDueNotifications();
    expect(sweep.sent).toBeGreaterThanOrEqual(1);
    const retried = await client.query(
      "SELECT status, attempts FROM notification_outbox WHERE idempotency_key = $1",
      [`${PREFIX}-retry`],
    );
    expect(retried.rows[0]).toMatchObject({ status: "sent", attempts: 2 });
  });

  test("review queue: batched page matches the old list; filters and cursor", async () => {
    const { rows: rooms } = await client.query<{ id: number; room_code: string }>(
      "SELECT id, room_code FROM rooms ORDER BY id LIMIT 1",
    );
    const room = rooms[0];
    if (!room) throw new Error("seed room missing");
    for (const [n, who] of [
      [1, "alpha"],
      [2, "alpha"],
      [3, "beta"],
    ] as const) {
      await client.query(
        `INSERT INTO edit_proposals (entity_type, entity_id, status, proposed_patch, base_version, submitter_name, created_at)
         VALUES ('room', $1, 'pending', $2, 1, $3, now() - make_interval(days => $4))`,
        [room.id, JSON.stringify({ roomName: `Renamed ${n}` }), `${PREFIX}-${who}`, n * 2],
      );
    }
    const page1 = await listReviewQueue({
      entityType: "room",
      submitter: null,
      olderThanDays: null,
      q: PREFIX,
      cursor: null,
      limit: 2,
    });
    expect(page1.proposals).toHaveLength(2);
    expect(page1.matchCount).toBe(3);
    expect(page1.proposals[0]?.entityLabel).toBe(room.room_code);
    expect(page1.proposals[0]?.currentValues).not.toBeNull();
    expect(page1.nextCursor).not.toBeNull();

    const { decodeReviewCursor } = await import("@lib/proposals/review-queue-params");
    const page2 = await listReviewQueue({
      entityType: "room",
      submitter: null,
      olderThanDays: null,
      q: PREFIX,
      cursor: decodeReviewCursor(page1.nextCursor),
      limit: 2,
    });
    expect(page2.proposals).toHaveLength(1);
    expect(page2.nextCursor).toBeNull();

    const beta = await listReviewQueue({
      entityType: null,
      submitter: `${PREFIX}-beta`,
      olderThanDays: 5,
      q: null,
      cursor: null,
      limit: 25,
    });
    expect(beta.proposals.map((p) => p.submitterName)).toEqual([`${PREFIX}-beta`]);

    // Label search hits the room code even though it is not in the patch.
    const byLabel = await listReviewQueue({
      entityType: null,
      submitter: `${PREFIX}-alpha`,
      olderThanDays: null,
      q: room.room_code,
      cursor: null,
      limit: 25,
    });
    expect(byLabel.matchCount).toBe(2);

    const legacy = await listPendingProposalsForReview();
    const legacyMine = legacy.find((p) => p.submitterName === `${PREFIX}-beta`);
    expect(legacyMine?.entityLabel).toBe(room.room_code);
  });
});
