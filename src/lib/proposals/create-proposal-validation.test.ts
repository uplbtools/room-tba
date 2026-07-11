import { describe, expect, test } from "bun:test";
import {
  ProposalValidationError,
  validateCreateProposalPatch,
} from "./create-proposal-validation";

describe("create_jeepney_stop proposal validation", () => {
  test("requires a route, copy, and usable coordinates", () => {
    expect(() =>
      validateCreateProposalPatch("create_jeepney_stop", {
        routeId: "kaliwa-kanan",
        name: "New stop",
        description: "Near the gate.",
        lat: 14.16,
        lon: 121.24,
      }),
    ).not.toThrow();

    expect(() =>
      validateCreateProposalPatch("create_jeepney_stop", {
        routeId: "kaliwa-kanan",
        name: "",
        description: "Near the gate.",
        lat: 14.16,
        lon: 121.24,
      }),
    ).toThrow(ProposalValidationError);
  });
});
