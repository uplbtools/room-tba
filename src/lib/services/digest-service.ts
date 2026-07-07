import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { adminUsersTable } from "@drizzle/schema";
import { db } from "@lib/db";
import { buildProposalDigest } from "@lib/email/digest-core";
import { isResendConfigured, sendEmail } from "@lib/email/resend";
import { listPendingProposals } from "@lib/services/proposal-service";
import { SITE_URL } from "@lib/site";

export async function listDigestRecipients(): Promise<string[]> {
  const rows = await db
    .select({ email: adminUsersTable.email })
    .from(adminUsersTable)
    .where(
      and(
        eq(adminUsersTable.isActive, true),
        isNotNull(adminUsersTable.email),
        sql`${adminUsersTable.email} <> ''`,
        inArray(adminUsersTable.role, ["admin", "editor"] as const),
      ),
    );
  return rows
    .map((row) => row.email?.trim().toLowerCase())
    .filter((email): email is string => Boolean(email));
}

export type DigestRunResult = {
  skipped: "unconfigured" | "no_pending" | "no_recipients" | null;
  pendingCount: number;
  recipientCount: number;
};

export async function sendProposalDigest(): Promise<DigestRunResult> {
  if (!isResendConfigured()) {
    return { skipped: "unconfigured", pendingCount: 0, recipientCount: 0 };
  }

  const proposals = await listPendingProposals();
  const digest = buildProposalDigest(proposals, SITE_URL);
  if (!digest) {
    return { skipped: "no_pending", pendingCount: 0, recipientCount: 0 };
  }

  const recipients = await listDigestRecipients();
  if (recipients.length === 0) {
    return {
      skipped: "no_recipients",
      pendingCount: proposals.length,
      recipientCount: 0,
    };
  }

  // Individual sends keep recipient addresses private to each editor.
  for (const to of recipients) {
    try {
      await sendEmail({ to: [to], ...digest });
    } catch (error) {
      console.error(`Proposal digest to ${to} failed:`, error);
    }
  }

  return {
    skipped: null,
    pendingCount: proposals.length,
    recipientCount: recipients.length,
  };
}
