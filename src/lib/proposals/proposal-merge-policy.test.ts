import { describe, expect, test } from "bun:test";
import { allowEntityScopedProposalMerge } from "@lib/proposals/proposal-merge-policy";

describe("allowEntityScopedProposalMerge", () => {
  test("create proposals only merge when proposalId is sent explicitly", () => {
    expect(allowEntityScopedProposalMerge(true, 42)).toBe(false);
    expect(allowEntityScopedProposalMerge(true, null)).toBe(false);
  });

  test("update proposals still merge for signed-in submitters", () => {
    expect(allowEntityScopedProposalMerge(false, 42)).toBe(true);
    expect(allowEntityScopedProposalMerge(false, null)).toBe(false);
  });
});
