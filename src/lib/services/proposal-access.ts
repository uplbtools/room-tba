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
