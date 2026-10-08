import { adminUsersTable } from "@drizzle/schema";
import { db } from "@lib/db";
import { isResendConfigured, sendEmail } from "@lib/email/resend";
import {
  buildReviewEmail,
  buildStaffReviewEmail,
  type ReviewOutcome,
  reviewNoticeSends,
} from "@lib/email/review-notice-core";
import { listDigestRecipients } from "@lib/services/digest-service";
import { and, eq, isNotNull } from "drizzle-orm";

export type { ReviewOutcome } from "@lib/email/review-notice-core";

type ReviewNoticeInput = {
  outcome: ReviewOutcome;
  entityLabel: string | null;
  submitterName: string | null;
  submitterUserId: number | null;
  reviewedBy: string;
  note?: string | null;
};

/**
 * Email the contributor about a review outcome, and the core team in a
 * separate message: the contributor's copy never exposes staff addresses.
 * Only a verified contributor address is used. Best effort: review actions
 * must never fail because mail did (#nagger); each send fails on its own.
 *
 * The wording and the recipient split live in review-notice-core so bun test
 * can load them: this file reaches astro:env/server through resend.ts, and
 * that import is what a unit test cannot resolve.
 */
export async function sendReviewNotice(input: ReviewNoticeInput) {
  if (!isResendConfigured()) return;
  try {
    let contributorEmail: string | null = null;
    if (input.submitterUserId) {
      const [row] = await db
        .select({ email: adminUsersTable.email })
        .from(adminUsersTable)
        .where(
          and(
            eq(adminUsersTable.id, input.submitterUserId),
            isNotNull(adminUsersTable.emailVerifiedAt),
          ),
        );
      contributorEmail = row?.email?.trim() || null;
    }
    const core = await listDigestRecipients();
    const sends = reviewNoticeSends(contributorEmail, core);
    const contributorNotified = sends.some(
      (send) => send.audience === "contributor",
    );
    await Promise.all(
      sends.map(async (send) => {
        const content =
          send.audience === "contributor"
            ? buildReviewEmail(input)
            : buildStaffReviewEmail({ ...input, contributorNotified });
        try {
          await sendEmail({ to: send.to, ...content });
        } catch (err) {
          console.error(`Review notice email (${send.audience}) failed:`, err);
        }
      }),
    );
  } catch (err) {
    console.error("Review notice email failed:", err);
  }
}
