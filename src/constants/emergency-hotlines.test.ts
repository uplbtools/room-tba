import { describe, expect, test } from "bun:test";
import {
  EMERGENCY_HOTLINE_CATEGORIES,
  emergencyHotlineTel,
} from "./emergency-hotlines.ts";

describe("emergency hotlines", () => {
  test("keeps every category and contact callable", () => {
    expect(EMERGENCY_HOTLINE_CATEGORIES.map(({ name }) => name)).toEqual([
      "Student-led",
      "University",
      "Local",
      "Medical",
    ]);

    for (const { entries } of EMERGENCY_HOTLINE_CATEGORIES) {
      expect(entries.length).toBeGreaterThan(0);
      for (const entry of entries) {
        expect(entry.name).not.toBe("");
        expect(entry.numbers.length).toBeGreaterThan(0);
      }
    }
  });

  test("normalizes Philippine mobile and landline numbers for tel links", () => {
    expect(emergencyHotlineTel("0961 396 3441")).toBe("tel:+639613963441");
    expect(emergencyHotlineTel("(049) 536 7965")).toBe("tel:+63495367965");
  });
});
