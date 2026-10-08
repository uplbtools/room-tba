import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { adminUsersTable } from "@drizzle/schema";
import { db } from "@lib/db";
import { buildProposalDigest } from "@lib/email/digest-core";
import { isResendConfigured, sendEmail } from "@lib/email/resend";
import type { EmailTopic } from "@lib/email/unsubscribe-core";
import { unsubscribeParts } from "@lib/email/unsubscribe";
import { claimCronRun, finishCronRun } from "@lib/services/cron-run-service";
import { optedOutUserIds } from "@lib/services/notification-preferences-service";
import { listPendingProposals } from "@lib/services/proposal-service";
import { SITE_URL } from "@lib/site";

export const DIGEST_JOB = "proposal-digest";

export type StaffRecipient = { id: number; email: string };

/**
 * Active admins and editors with an email, minus anyone who switched
 * `topic` off in Account settings or via an unsubscribe link.
 */
export async function listStaffRecipients(
  topic: EmailTopic,
): Promise<StaffRecipient[]> {
  const rows = await db
    .select({ id: adminUsersTable.id, email: adminUsersTable.email })
    .from(adminUsersTable)
    .where(
      and(
        eq(adminUsersTable.isActive, true),
        isNotNull(adminUsersTable.email),
        sql`${adminUsersTable.email} <> ''`,
        inArray(adminUsersTable.role, ["admin", "editor"] as const),
      ),
    );
  const recipients = rows
    .map((row) => ({
      id: row.id,
      email: row.email?.trim().toLowerCase() ?? "",
    }))
    .filter((row) => row.email.length > 0);
  const optedOut = await optedOutUserIds(
    recipients.map((r) => r.id),
    topic,
  );
  return recipients.filter((r) => !optedOut.has(r.id));
}

/** Digest recipients' addresses (kept for callers that only need emails). */
export async function listDigestRecipients(): Promise<string[]> {
  return (await listStaffRecipients("digest")).map((r) => r.email);
}

export type DigestRunResult = {
  skipped:
    | "unconfigured"
    | "already_sent"
    | "no_pending"
    | "no_recipients"
    | null;
  pendingCount: number;
  recipientCount: number;
  failedCount?: number;
};

/** UTC date the digest run belongs to; one digest per day. */
export function digestPeriod(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export async function sendProposalDigest(
  now = new Date(),
): Promise<DigestRunResult> {
  if (!isResendConfigured()) {
    return { skipped: "unconfigured", pendingCount: 0, recipientCount: 0 };
  }

  const period = digestPeriod(now);
  if (!(await claimCronRun(DIGEST_JOB, period))) {
    return { skipped: "already_sent", pendingCount: 0, recipientCount: 0 };
  }

  try {
    const result = await runDigest(period);
    await finishCronRun(DIGEST_JOB, period, "done", result);
    return result;
  } catch (error) {
    await finishCronRun(DIGEST_JOB, period, "failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

async function runDigest(period: string): Promise<DigestRunResult> {
  const proposals = await listPendingProposals();
  const digest = buildProposalDigest(proposals, SITE_URL);
  if (!digest) {
    return { skipped: "no_pending", pendingCount: 0, recipientCount: 0 };
  }

  const recipients = await listStaffRecipients("digest");
  if (recipients.length === 0) {
    return {
      skipped: "no_recipients",
      pendingCount: proposals.length,
      recipientCount: 0,
    };
  }

  // Individual sends keep recipient addresses private to each editor, and
  // give each one their own unsubscribe link.
  let failedCount = 0;
  for (const recipient of recipients) {
    const { footer, headers } = unsubscribeParts(recipient.id, "digest");
    try {
      await sendEmail({
        to: [recipient.email],
        subject: digest.subject,
        text: `${digest.text}\n${footer}`,
        template: "digest",
        idempotencyKey: `digest:${period}:${recipient.email}`,
        headers,
      });
    } catch (error) {
      failedCount += 1;
      console.error(`Proposal digest to ${recipient.email} failed:`, error);
    }
  }

  return {
    skipped: null,
    pendingCount: proposals.length,
    recipientCount: recipients.length,
    failedCount,
  };
}
