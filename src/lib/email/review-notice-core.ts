/** Pure review-notice formatting (no astro:env/db imports) so bun test can load it. */

export type ReviewOutcome = "approved" | "rejected" | "needs_changes";

const OUTCOME_COPY: Record<ReviewOutcome, { subject: string; lead: string }> = {
  approved: {
    subject: "Your Room TBA edit was approved",
    lead: "Your suggested edit is now live on the map. Thank you!",
  },
  rejected: {
    subject: "Your Room TBA edit was closed",
    lead: "Your suggested edit was closed by a reviewer.",
  },
  needs_changes: {
    subject: "Your Room TBA edit needs a small change",
    lead: "A reviewer looked at your suggested edit and asked for a change before it can go live.",
  },
};

export type ReviewNoticeSend = {
  audience: "contributor" | "staff";
  to: string[];
};

/**
 * Separate sends, never a shared header: the contributor's copy goes to the
 * contributor alone (no staff addresses in To/CC), and the staff copy goes to
 * the core team only. A contributor who is also staff gets just their own copy.
 */
export function reviewNoticeSends(
  contributorEmail: string | null,
  core: string[],
): ReviewNoticeSend[] {
  const contributor = contributorEmail?.trim().toLowerCase() || null;
  const staff = [
    ...new Set(core.map((email) => email.trim().toLowerCase())),
  ].filter((email) => email && email !== contributor);
  const sends: ReviewNoticeSend[] = [];
  if (contributor) sends.push({ audience: "contributor", to: [contributor] });
  if (staff.length > 0) sends.push({ audience: "staff", to: staff });
  return sends;
}

export type ReviewEmailInput = {
  outcome: ReviewOutcome;
  entityLabel: string | null;
  submitterName: string | null;
  reviewedBy: string;
  note?: string | null;
};

/** Staff copy: same facts, addressed to the team, says who was told. */
export function buildStaffReviewEmail(
  input: ReviewEmailInput & { contributorNotified: boolean },
): { subject: string; text: string } {
  const label = input.entityLabel ?? "a map entry";
  const outcome =
    input.outcome === "needs_changes"
      ? "changes requested"
      : input.outcome === "approved"
        ? "approved"
        : "closed";
  const noteBlock = input.note?.trim()
    ? `\n\nReviewer note:\n${input.note.trim()}`
    : "";
  const told = input.contributorNotified
    ? "The contributor was emailed separately."
    : "The contributor has no confirmed email, so only the team got this.";
  return {
    subject: `Review ${outcome}: ${label}`,
    text: `Edit: ${label}\nSubmitted by: ${input.submitterName ?? "anonymous"}\nReviewed by: ${input.reviewedBy}\nOutcome: ${outcome}${noteBlock}\n\n${told}\n`,
  };
}

export function buildReviewEmail(input: ReviewEmailInput): {
  subject: string;
  text: string;
} {
  const copy = OUTCOME_COPY[input.outcome];
  const label = input.entityLabel ?? "a map entry";
  const who = input.submitterName ?? "there";
  const noteBlock = input.note?.trim()
    ? `\n\nReviewer note:\n${input.note.trim()}`
    : "";
  return {
    subject: `${copy.subject}: ${label}`,
    text: `Hi ${who},\n\n${copy.lead}\n\nEdit: ${label}\nReviewed by: ${input.reviewedBy}${noteBlock}\n\nSuggest more edits any time at https://room-tba.uplb.tools\n`,
  };
}
