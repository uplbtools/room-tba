import type { SessionUser } from "@lib/admin/auth";
import { canReviewProposals } from "@lib/admin/roles";
import { proposalTokenMatches } from "@lib/proposals/proposal-token";

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

type OwnedProposalRow = Pick<ProposalAccessRow, "submitterUserId"> & {
  withdrawTokenHash: string | null;
};

/**
 * Does the caller own this proposal? Signed-in owners match by account id;
 * anonymous proposals only by the random token handed out at submit (the
 * display name is public and guessable, so it proves nothing).
 */
export function ownsProposal(
  session: SessionUser | null,
  proposal: OwnedProposalRow,
  proposalToken?: unknown,
): boolean {
  if (session && session.id > 0 && proposal.submitterUserId === session.id) {
    return true;
  }
  return (
    proposal.submitterUserId == null &&
    proposalTokenMatches(proposalToken, proposal.withdrawTokenHash)
  );
}

type WithdrawProposalRow = OwnedProposalRow & {
  status: string;
};

export function canWithdrawProposal(
  session: SessionUser | null,
  proposal: WithdrawProposalRow,
  proposalToken?: unknown,
): boolean {
  if (!["pending", "needs_changes"].includes(proposal.status)) return false;
  return ownsProposal(session, proposal, proposalToken);
}
