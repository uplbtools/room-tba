import { describe, expect, test } from "bun:test";
import {
  generateProposalToken,
  hashProposalToken,
} from "@lib/proposals/proposal-token";
import {
  canViewProposalSubmitterDetails,
  canWithdrawProposal,
  ownsProposal,
} from "./proposal-access";

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
  const token = generateProposalToken();
  const proposal = {
    submitterUserId: 5,
    submitterName: "Ana",
    status: "pending",
    withdrawTokenHash: hashProposalToken(token),
  };
  const anonymous = { ...proposal, submitterUserId: null };
  const ana = {
    id: 5,
    username: "ana",
    displayName: "Ana",
    role: "contributor" as const,
  };

  test("matching signed-in submitter can withdraw open proposals", () => {
    expect(canWithdrawProposal(ana, proposal)).toBe(true);
  });

  test("anonymous submitter can withdraw with the submit-time token", () => {
    expect(canWithdrawProposal(null, anonymous, token)).toBe(true);
  });

  test("a matching display name alone no longer proves ownership", () => {
    expect(canWithdrawProposal(null, anonymous, "Ana")).toBe(false);
    expect(canWithdrawProposal(null, anonymous)).toBe(false);
  });

  test("a wrong or missing token is rejected", () => {
    expect(canWithdrawProposal(null, anonymous, generateProposalToken())).toBe(
      false,
    );
    expect(
      canWithdrawProposal(
        null,
        { ...anonymous, withdrawTokenHash: null },
        token,
      ),
    ).toBe(false);
  });

  test("the token cannot take over an account-owned proposal", () => {
    expect(canWithdrawProposal(null, proposal, token)).toBe(false);
  });

  test("another signed-in user cannot withdraw", () => {
    expect(canWithdrawProposal({ ...ana, id: 9 }, proposal)).toBe(false);
  });

  test("closed proposals cannot be withdrawn", () => {
    expect(
      canWithdrawProposal(null, { ...anonymous, status: "approved" }, token),
    ).toBe(false);
  });
});

describe("ownsProposal", () => {
  test("a signed-in user can still use the token of a proposal sent anonymously", () => {
    const token = generateProposalToken();
    expect(
      ownsProposal(
        { id: 3, username: "x", displayName: "X", role: "contributor" },
        { submitterUserId: null, withdrawTokenHash: hashProposalToken(token) },
        token,
      ),
    ).toBe(true);
  });
});
