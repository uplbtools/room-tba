import { describe, expect, test } from "bun:test";
import type { EditProposalSummary } from "@lib/services/proposal-service";
import { emitProposalReviewed, emitProposalSubmitted } from "./proposal-events";

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

  test("emitProposalReviewed uses NoOp adapter without error", async () => {
    await expect(
      emitProposalReviewed(sampleProposal, "approved"),
    ).resolves.toBeUndefined();
  });
});
