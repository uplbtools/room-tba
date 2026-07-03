import { describe, expect, test, mock } from "bun:test";
import type { EditProposalSummary } from "@lib/services/proposal-service";

const notify = mock(async () => {});

mock.module("./index", () => ({
  getNotificationAdapter: () => ({ notify }),
}));

const { emitProposalReviewed, emitProposalSubmitted } = await import(
  "./proposal-events"
);

const sampleProposal = {
  id: 42,
  entityType: "room",
  entityId: 230,
  entityLabel: "CEM 203",
  submitterName: "Yeyel",
  submitterUserId: null,
  status: "approved",
  proposedPatch: {},
  baseVersion: 1,
  adminNote: null,
  reviewedBy: "Stimmie",
  reviewedAt: "2026-07-03T00:00:00.000Z",
  createdAt: "2026-07-02T00:00:00.000Z",
  updatedAt: "2026-07-03T00:00:00.000Z",
} satisfies EditProposalSummary;

describe("proposal notification events", () => {
  test("emitProposalSubmitted uses NoOp adapter without error", async () => {
    await expect(
      emitProposalSubmitted(sampleProposal, undefined),
    ).resolves.toBeUndefined();
  });

  test("emitProposalReviewed sends proposal.reviewed envelope", async () => {
    notify.mockClear();
    await emitProposalReviewed(sampleProposal, "approved");
    expect(notify).toHaveBeenCalledTimes(1);
    const envelope = notify.mock.calls[0]?.[0] as {
      type: string;
      idempotencyKey: string;
      payload: { outcome: string; entityLabel: string };
    };
    expect(envelope.type).toBe("proposal.reviewed");
    expect(envelope.idempotencyKey).toBe("proposal:42:reviewed:approved");
    expect(envelope.payload.outcome).toBe("approved");
    expect(envelope.payload.entityLabel).toBe("CEM 203");
  });
});
