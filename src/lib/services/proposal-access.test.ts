import { describe, expect, test } from "bun:test";
import { canViewProposalSubmitterDetails, canWithdrawProposal } from "./proposal-access";

describe("canViewProposalSubmitterDetails", () => {
  const proposal = {
    submitterUserId: 5,
    submitterName: "Ana",
  };

  test("reviewers can view full proposal details", () => {
    expect(
      canViewProposalSubmitterDetails(
        {
          id: 1,
          username: "editor",
          displayName: "Editor",
          role: "editor",
        },
        proposal,
      ),
    ).toBe(true);
  });

  test("matching submitter user id can view details", () => {
    expect(
      canViewProposalSubmitterDetails(
        {
          id: 5,
          username: "ana",
          displayName: "Ana",
          role: "contributor",
        },
        proposal,
      ),
    ).toBe(true);
  });

  test("anonymous users cannot guess access via submitter name", () => {
    expect(canViewProposalSubmitterDetails(null, proposal)).toBe(false);
  });

  test("other signed-in users cannot view someone else's proposal", () => {
    expect(
      canViewProposalSubmitterDetails(
        {
          id: 9,
          username: "other",
          displayName: "Other",
          role: "contributor",
        },
        proposal,
      ),
    ).toBe(false);
  });
});

describe("canWithdrawProposal", () => {
  const proposal = {
    submitterUserId: 5,
    submitterName: "Ana",
    status: "pending",
  };

  test("matching signed-in submitter can withdraw open proposals", () => {
    expect(
      canWithdrawProposal(
        {
          id: 5,
          username: "ana",
          displayName: "Ana",
          role: "contributor",
        },
        proposal,
      ),
    ).toBe(true);
  });

  test("anonymous submitter can withdraw with matching display name", () => {
    expect(
      canWithdrawProposal(
        null,
        { ...proposal, submitterUserId: null },
        "Ana",
      ),
    ).toBe(true);
  });

  test("closed proposals cannot be withdrawn", () => {
    expect(
      canWithdrawProposal(null, { ...proposal, status: "approved" }, "Ana"),
    ).toBe(false);
  });
});
