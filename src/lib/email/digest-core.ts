/** Pure digest formatting (no astro:env/db imports) so bun test can load it. */

export type DigestProposal = {
  entityType: string;
  entityLabel: string | null;
  submitterName: string | null;
  status: string;
};

export type DigestEmail = {
  subject: string;
  text: string;
};

export function buildProposalDigest(
  proposals: DigestProposal[],
  siteUrl: string,
): DigestEmail | null {
  if (proposals.length === 0) return null;

  const lines = proposals.map((p) => {
    const kind = p.entityType.replace("create_", "new ");
    const submitter = p.submitterName?.trim() || "Anonymous";
    const status = p.status === "needs_changes" ? " (resubmit requested)" : "";
    return `- ${kind}: ${p.entityLabel ?? "(unnamed)"}, from ${submitter}${status}`;
  });

  const count = proposals.length;
  return {
    subject: `Room TBA: ${count} proposal${count === 1 ? "" : "s"} awaiting review`,
    text: [
      `There ${count === 1 ? "is 1 contributor proposal" : `are ${count} contributor proposals`} waiting in the review queue:`,
      "",
      ...lines,
      "",
      `Review them in the editor: ${siteUrl}/?editor=login`,
      "",
      "You receive this daily digest because your Room TBA editor account has an email address on file.",
    ].join("\n"),
  };
}
