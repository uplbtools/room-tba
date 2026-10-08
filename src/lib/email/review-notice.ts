import { adminUsersTable } from "@drizzle/schema";
import { db } from "@lib/db";
import { isResendConfigured, sendEmail } from "@lib/email/resend";
import {
  buildReviewEmail,
  type ReviewOutcome,
  reviewRecipients,
} from "@lib/email/review-notice-core";
import { unsubscribeParts } from "@lib/email/unsubscribe";
import { listStaffRecipients } from "@lib/services/digest-service";
import { optedOutUserIds } from "@lib/services/notification-preferences-service";
import { eq } from "drizzle-orm";

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
 * Email the contributor about a review outcome, and the core team a copy.
 * Best effort: review actions must never fail because mail did (#nagger),
 * and callers run this after the response.
 *
 * Every recipient gets their own message: addresses stay private to each
 * person, and each copy carries that person's unsubscribe link and
 * List-Unsubscribe headers (auth audit item 20). People who switched review
 * notices off are skipped. The Resend Idempotency-Key makes a retried review
 * request unable to mail twice.
 *
 * The wording and the To/CC split live in review-notice-core so bun test can
 * load them: this file reaches astro:env/server through resend.ts, and that
 * import is what a unit test cannot resolve.
 */
export async function sendReviewNotice(input: ReviewNoticeInput) {
  if (!isResendConfigured()) return;
  try {
    let contributor: { id: number; email: string } | null = null;
    if (input.submitterUserId) {
      const [row] = await db
        .select({ email: adminUsersTable.email })
        .from(adminUsersTable)
        .where(eq(adminUsersTable.id, input.submitterUserId));
      const email = row?.email?.trim().toLowerCase();
      if (email) {
        const optedOut = await optedOutUserIds(
          [input.submitterUserId],
          "review_notices",
        );
        if (!optedOut.has(input.submitterUserId)) {
          contributor = { id: input.submitterUserId, email };
        }
      }
    }
    const core = await listStaffRecipients("review_notices");
    const { to, cc } = reviewRecipients(
      contributor?.email ?? null,
      core.map((r) => r.email),
    );
    const byEmail = new Map(core.map((r) => [r.email, r.id]));
    if (contributor) byEmail.set(contributor.email, contributor.id);

    const { subject, text } = buildReviewEmail(input);
    for (const email of [...to, ...cc]) {
      const userId = byEmail.get(email);
      if (userId === undefined) continue;
      const { footer, headers } = unsubscribeParts(userId, "review_notices");
      try {
        await sendEmail({
          to: [email],
          subject,
          text: `${text}${footer}`,
          template: `review-${input.outcome}`,
          idempotencyKey: `review:${input.proposalId}:${input.outcome}:${email}`,
          headers,
        });
      } catch (err) {
        console.error(`Review notice to ${email} failed:`, err);
      }
    }
  } catch (err) {
    console.error("Review notice email failed:", err);
  }
}
