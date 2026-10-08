import { adminUsersTable } from "@drizzle/schema";
import { db } from "@lib/db";
import { isResendConfigured, sendEmail } from "@lib/email/resend";
import {
  buildReviewEmail,
  buildStaffReviewEmail,
  type ReviewOutcome,
  reviewNoticeSends,
} from "@lib/email/review-notice-core";
import { unsubscribeParts } from "@lib/email/unsubscribe";
import { listStaffRecipients } from "@lib/services/digest-service";
import { optedOutUserIds } from "@lib/services/notification-preferences-service";
import { and, eq } from "drizzle-orm";
import {
  emailIsVerifiedSql,
  withVerification,
} from "@lib/services/account-security";

export type { ReviewOutcome } from "@lib/email/review-notice-core";

type ReviewNoticeInput = {
  proposalId: number;
  outcome: ReviewOutcome;
  entityLabel: string | null;
  submitterName: string | null;
  submitterUserId: number | null;
  reviewedBy: string;
  note?: string | null;
};

/**
 * Email the contributor about a review outcome, and the core team in a
 * separate staff copy. Best effort: review actions must never fail because
 * mail did (#nagger), and callers run this after the response.
 *
 * Only a verified contributor address is used (staff recipients are
 * verified-only too). Every recipient gets their own message: addresses stay
 * private to each person, and each copy carries that person's unsubscribe
 * link and List-Unsubscribe headers (auth audit item 20). People who switched
 * review notices off are skipped. The Resend Idempotency-Key makes a retried
 * review request unable to mail twice.
 *
 * The wording and the recipient split live in review-notice-core so bun test
 * can load them: this file reaches astro:env/server through resend.ts, and
 * that import is what a unit test cannot resolve.
 */
export async function sendReviewNotice(input: ReviewNoticeInput) {
  if (!isResendConfigured()) return;
  try {
    let contributor: { id: number; email: string } | null = null;
    if (input.submitterUserId) {
      const submitterUserId = input.submitterUserId;
      const [row] = await withVerification(
        () =>
          db
            .select({ email: adminUsersTable.email })
            .from(adminUsersTable)
            .where(
              and(eq(adminUsersTable.id, submitterUserId), emailIsVerifiedSql),
            ),
        [],
      );
      const email = row?.email?.trim().toLowerCase();
      if (email) {
        const optedOut = await optedOutUserIds(
          [submitterUserId],
          "review_notices",
        );
        if (!optedOut.has(submitterUserId)) {
          contributor = { id: submitterUserId, email };
        }
      }
    }
    const core = await listStaffRecipients("review_notices");
    const sends = reviewNoticeSends(
      contributor?.email ?? null,
      core.map((r) => r.email),
    );
    const contributorNotified = sends.some(
      (send) => send.audience === "contributor",
    );
    const byEmail = new Map(core.map((r) => [r.email, r.id]));
    if (contributor) byEmail.set(contributor.email, contributor.id);

    for (const send of sends) {
      const { subject, text } =
        send.audience === "contributor"
          ? buildReviewEmail(input)
          : buildStaffReviewEmail({ ...input, contributorNotified });
      for (const email of send.to) {
        const userId = byEmail.get(email);
        if (userId === undefined) continue;
        const { footer, headers } = unsubscribeParts(userId, "review_notices");
        try {
          await sendEmail({
            to: [email],
            subject,
            text: `${text}${footer}`,
            template: `review-${input.outcome}${send.audience === "staff" ? "-staff" : ""}`,
            idempotencyKey: `review:${input.proposalId}:${input.outcome}:${email}`,
            headers,
          });
        } catch (err) {
          console.error(
            `Review notice (${send.audience}) to ${email} failed:`,
            err,
          );
        }
      }
    }
  } catch (err) {
    console.error("Review notice email failed:", err);
  }
}
