import { describe, expect, test } from "bun:test";
import {
  ORG_CATEGORIES,
  normalizeOrgCategory,
  orgCategoryLabel,
} from "./org-categories.js";

describe("normalizeOrgCategory", () => {
  test("accepts known categories case/space-insensitively", () => {
    expect(normalizeOrgCategory("student-org")).toBe("student-org");
    expect(normalizeOrgCategory(" Office ")).toBe("office");
    expect(normalizeOrgCategory("SERVICE")).toBe("service");
  });
  test("rejects unknown/empty/non-string", () => {
    expect(normalizeOrgCategory("dorm")).toBeNull();
    expect(normalizeOrgCategory("")).toBeNull();
    expect(normalizeOrgCategory(null)).toBeNull();
  });
  test("every category round-trips and has a label", () => {
    for (const c of ORG_CATEGORIES) {
      expect(normalizeOrgCategory(c)).toBe(c);
      expect(orgCategoryLabel(c)).toBeTruthy();
    }
  });
});
