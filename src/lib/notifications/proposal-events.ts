import { getNotificationAdapter } from "./index";
import type { EditProposalSummary } from "@lib/services/proposal-service";

export type ProposalReviewOutcome = "approved" | "rejected" | "needs_changes";

export async function emitProposalSubmitted(
  proposal: EditProposalSummary,
  sessionUserId: number | undefined,
): Promise<void> {
  const notifications = getNotificationAdapter();
  await notifications.notify({
    schemaVersion: 1,
    type: "proposal.submitted",
    source: "room-tba",
    occurredAt: new Date().toISOString(),
    idempotencyKey: `proposal:${proposal.id}:submitted`,
    payload: {
      proposalId: proposal.id,
      entityType: proposal.entityType,
      entityId: proposal.entityId,
      entityLabel: proposal.entityLabel,
      submitterName: proposal.submitterName,
      isAnonymous: !sessionUserId,
    },
  });
}

export async function emitProposalReviewed(
  proposal: EditProposalSummary,
  outcome: ProposalReviewOutcome,
): Promise<void> {
  const notifications = getNotificationAdapter();
  await notifications.notify({
    schemaVersion: 1,
    type: "proposal.reviewed",
    source: "room-tba",
    occurredAt: new Date().toISOString(),
    idempotencyKey: `proposal:${proposal.id}:reviewed:${outcome}`,
    payload: {
      proposalId: proposal.id,
      outcome,
      entityType: proposal.entityType,
      entityId: proposal.entityId,
      entityLabel: proposal.entityLabel,
      submitterName: proposal.submitterName,
      reviewedBy: proposal.reviewedBy ?? "Unknown",
      adminNote: proposal.adminNote,
    },
  });
}

export function logNotificationEmitFailure(context: string, err: unknown) {
  console.error(`${context}:`, err);
}
