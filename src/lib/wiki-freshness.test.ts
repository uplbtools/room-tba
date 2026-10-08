import { describe, expect, test } from "bun:test";
import { formatLongDay, hasDayPassed, UPCAT_EXAM_LAST_DAY } from "./wiki-freshness";

describe("hasDayPassed", () => {
  test("the day itself is still upcoming until midnight in Manila", () => {
    expect(hasDayPassed("2026-08-02", new Date("2026-08-02T15:59:00Z"))).toBe(
      false,
    );
  });

  test("passes once the next Manila day starts", () => {
    expect(hasDayPassed("2026-08-02", new Date("2026-08-02T16:00:01Z"))).toBe(
      true,
    );
  });

  test("rejects malformed dates", () => {
    expect(() => hasDayPassed("soon")).toThrow();
  });

  test("the UPCAT article is flagged as past from August 3, 2026", () => {
    expect(hasDayPassed(UPCAT_EXAM_LAST_DAY, new Date("2026-08-03T00:00:00Z"))).toBe(
      true,
    );
    expect(hasDayPassed(UPCAT_EXAM_LAST_DAY, new Date("2026-07-27T00:00:00Z"))).toBe(
      false,
    );
  });
});

describe("formatLongDay", () => {
  test("formats in Manila time", () => {
    expect(formatLongDay("2026-08-02")).toBe("August 2, 2026");
  });
});
