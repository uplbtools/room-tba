import { describe, expect, test } from "bun:test";
import { canPublishDirectly, canReviewProposals } from "./roles";

describe("editor roles", () => {
  test("contributor cannot publish or review", () => {
    expect(canPublishDirectly("contributor")).toBe(false);
    expect(canReviewProposals("contributor")).toBe(false);
  });

  test("editor can publish and review", () => {
    expect(canPublishDirectly("editor")).toBe(true);
    expect(canReviewProposals("editor")).toBe(true);
  });

  test("admin can publish and review", () => {
    expect(canPublishDirectly("admin")).toBe(true);
    expect(canReviewProposals("admin")).toBe(true);
  });
});
