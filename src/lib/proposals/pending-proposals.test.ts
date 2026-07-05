import { describe, expect, test } from "bun:test";
import {
  isOpenProposalStatus,
  formatProposalStatusLabel,
} from "./pending-proposals";

describe("pending-proposals helpers", () => {
  test("isOpenProposalStatus", () => {
    expect(isOpenProposalStatus("pending")).toBe(true);
    expect(isOpenProposalStatus("needs_changes")).toBe(true);
    expect(isOpenProposalStatus("withdrawn")).toBe(false);
  });

  test("formatProposalStatusLabel", () => {
    expect(formatProposalStatusLabel("needs_changes")).toBe("needs changes");
  });
});
