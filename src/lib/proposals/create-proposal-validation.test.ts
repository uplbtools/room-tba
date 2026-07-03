import { describe, expect, test } from "bun:test";
import {
  ProposalValidationError,
  validateCreateProposalPatch,
} from "@lib/proposals/create-proposal-validation";

describe("validateCreateProposalPatch", () => {
  test("create_room requires room code and buildingId", () => {
    expect(() =>
      validateCreateProposalPatch("create_room", {
        roomCode: "301",
      }),
    ).toThrow(ProposalValidationError);

    expect(() =>
      validateCreateProposalPatch("create_room", {
        roomCode: "",
        buildingId: 1,
      }),
    ).toThrow(ProposalValidationError);

    expect(() =>
      validateCreateProposalPatch("create_room", {
        roomCode: "301",
        buildingId: 1,
      }),
    ).not.toThrow();
  });
});
