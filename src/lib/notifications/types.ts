export type NotificationEventType =
  | "proposal.submitted"
  | "proposal.reviewed"
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
