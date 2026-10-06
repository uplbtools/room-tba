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

  describe("change of matriculation", () => {
    const com = { startsOn: "2026-08-03", endsOn: "2026-08-07" };
    const at = (iso: string) => new Date(`${iso}T04:00:00Z`).getTime();
    const recent = "2026-07-31T00:00:00Z";

    it("spells out COM and gives this semester's dates before it starts", () => {
      expect(
        classesScheduleFreshnessMessage(recent, at("2026-08-01"), com),
      ).toBe(
        "Schedules updated Jul 31, 2026. Classes and rooms can still change during this semester's change of matriculation (COM), Aug 3\u20137, 2026.",
      );
    });

    it("says COM is under way during the period", () => {
      expect(
        classesScheduleFreshnessMessage(recent, at("2026-08-05"), com),
      ).toContain(
        "Change of matriculation (COM) is under way this semester (Aug 3\u20137, 2026)",
      );
    });

    it("says an import from before COM ended may be out of date", () => {
      expect(
        classesScheduleFreshnessMessage(
          "2026-08-03T00:00:00Z",
          at("2026-10-06"),
          com,
        ),
      ).toBe(
        "Schedules last imported Aug 3, 2026, before this semester's change of matriculation (COM, Aug 3\u20137, 2026) ended, so some classes or rooms may have changed.",
      );
    });

    it("drops the COM note for an import made after COM", () => {
      expect(
        classesScheduleFreshnessMessage(
          "2026-08-20T00:00:00Z",
          at("2026-10-06"),
          com,
        ),
      ).toBe("Schedules last imported Aug 20, 2026. Data may be outdated.");
    });
  });
});
