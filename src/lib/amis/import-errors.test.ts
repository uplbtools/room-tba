import { describe, expect, it } from "bun:test";
import { classifyAmisHttpStatus, operatorHintForCode } from "./import-errors";
import {
  classesScheduleFreshnessMessage,
  isClassesScheduleStale,
} from "./term-schedule-freshness";

describe("import-errors", () => {
  it("maps HTTP status to operator codes", () => {
    expect(classifyAmisHttpStatus(401)).toBe("AUTH_EXPIRED");
    expect(classifyAmisHttpStatus(403)).toBe("FORBIDDEN");
    expect(classifyAmisHttpStatus(429)).toBe("RATE_LIMIT");
    expect(classifyAmisHttpStatus(503)).toBe("AMIS_UNAVAILABLE");
  });

  it("includes recovery hints", () => {
    expect(operatorHintForCode("FORBIDDEN")).toContain("cached JSON");
  });
});

describe("term-schedule-freshness", () => {
  it("marks missing import date as stale", () => {
    expect(isClassesScheduleStale(null)).toBe(true);
  });

  it("shows stale message after threshold", () => {
    const old = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString();
    expect(classesScheduleFreshnessMessage(old)).toContain("may be outdated");
  });

  it("shows fresh message for recent import", () => {
    const recent = new Date().toISOString();
    expect(classesScheduleFreshnessMessage(recent)).toContain(
      "Schedules updated",
    );
  });
});
