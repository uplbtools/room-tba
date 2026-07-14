import { describe, expect, test } from "bun:test";
import { featureTestRetirementFailures } from "./feature-test-retirement";

describe("feature test retirement", () => {
  test("requires coverage and inventory updates when a page is deleted", () => {
    expect(
      featureTestRetirementFailures([
        { status: "D", path: "src/pages/planner.astro" },
      ]),
    ).toHaveLength(2);
  });

  test("accepts a deleted page when its spec and inventory are updated", () => {
    expect(
      featureTestRetirementFailures([
        { status: "D", path: "src/pages/planner.astro" },
        { status: "D", path: "e2e/smoke/planner-flow.spec.ts" },
        { status: "M", path: "docs/test-inventory.md" },
      ]),
    ).toEqual([]);
  });

  test("does not require unrelated source deletions to change test coverage", () => {
    expect(
      featureTestRetirementFailures([
        { status: "D", path: "src/lib/unused-helper.ts" },
      ]),
    ).toEqual([]);
  });
});
