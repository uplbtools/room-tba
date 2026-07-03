import type { SessionUser } from "@lib/admin/auth";
import { canReviewProposals } from "@lib/admin/roles";

type ProposalAccessRow = {
  submitterUserId: number | null;
  submitterName: string;
};

export function canViewProposalSubmitterDetails(
  session: SessionUser | null,
  proposal: ProposalAccessRow,
): boolean {
  if (session && canReviewProposals(session.role)) return true;
  if (session && session.id > 0 && proposal.submitterUserId === session.id) {
    return true;
  }
  return false;
}

type WithdrawProposalRow = ProposalAccessRow & {
  status: string;
};

export function canWithdrawProposal(
  session: SessionUser | null,
  proposal: WithdrawProposalRow,
  submitterName?: string,
): boolean {
  if (!["pending", "needs_changes"].includes(proposal.status)) return false;
  if (session && session.id > 0 && proposal.submitterUserId === session.id) {
    return true;
  }
  if (
    !session &&
    proposal.submitterUserId == null &&
    typeof submitterName === "string" &&
    submitterName.trim() === proposal.submitterName.trim()
  ) {
    return true;
  }
  return false;
}
