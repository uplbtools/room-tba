export type NotificationEventType =
  | "proposal.submitted"
  | "proposal.reviewed"
  | "feedback.submitted"
  | "deploy.succeeded"
  | "deploy.failed"
  | "release.published"
  | "ci.e2e.failed"
  | "ci.e2e.passed"
  | "ci.e2e.advisory.failed"
  | "ci.staging-e2e.failed"
  | "ci.staging-smoke.failed";

export type NotificationSource = "room-tba" | "vercel" | "github";

export type NotificationEvent = {
  schemaVersion: 1;
  type: NotificationEventType;
  source: NotificationSource;
  occurredAt: string;
  idempotencyKey?: string;
  payload: Record<string, unknown>;
};

export type ProposalSubmittedPayload = {
  proposalId: number;
  entityType: string;
  entityId: number;
  entityLabel: string;
  submitterName: string;
  isAnonymous: boolean;
};

/** In-app feedback (#881). No IP or other harvested field is ever sent. */
export type FeedbackSubmittedPayload = {
  feedbackId: number;
  message: string;
  contact: string | null;
  screen: string | null;
  appVersion: string | null;
  wasOnline: boolean | null;
};

export type ProposalReviewOutcome = "approved" | "rejected" | "needs_changes";

export type ProposalReviewedPayload = {
  proposalId: number;
  outcome: ProposalReviewOutcome;
  entityType: string;
  entityId: number;
  entityLabel: string;
  submitterName: string;
  reviewedBy: string;
  adminNote: string | null;
};
