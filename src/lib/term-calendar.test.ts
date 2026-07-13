import { describe, expect, it } from "bun:test";
import {
  changeOfMatriculationLabel,
  finalsWindowLabel,
  isDateWithinTerm,
  isFinalsWeek,
  resolveActiveTermByDate,
  resolveInitialTermId,
  TERM_CALENDAR_WINDOWS,
} from "./term-calendar";
import type { Term } from "./types";

function term(id: number, overrides: Partial<Term> = {}): Term {
  const window = TERM_CALENDAR_WINDOWS[id];
  const semester =
    id === 1253 ? "midyear" : id === 1252 ? "2" : String(id - 1250);
  return {
    id,
    label: `Term ${id}`,
    schoolYear: "2025-2026",
    semester,
    startsOn: window?.startsOn ?? null,
    endsOn: window?.endsOn ?? null,
    isDefault: id === 1253,
    isActive: true,
    sortOrder: id,
    version: 1,
    updatedAt: "2026-01-01",
    ...overrides,
  };
}

describe("term-calendar", () => {
  it("detects midyear from Manila calendar date", () => {
    const midyear = term(1253);
    expect(
      isDateWithinTerm(midyear, new Date("2026-06-29T12:00:00+08:00")),
    ).toBe(true);
    expect(
      isDateWithinTerm(midyear, new Date("2026-08-01T12:00:00+08:00")),
    ).toBe(false);
  });

  it("resolves the in-session term for today", () => {
    const terms = [term(1251), term(1252), term(1253)];
    expect(
      resolveActiveTermByDate(terms, new Date("2026-06-29T08:00:00+08:00"))?.id,
    ).toBe(1253);
    expect(
      resolveActiveTermByDate(terms, new Date("2026-03-15T08:00:00+08:00"))?.id,
    ).toBe(1252);
  });

  it("handles postgres timestamp strings in UTC", () => {
    const midyear = term(1253, {
      startsOn: "2026-06-07T16:00:00.000Z",
      endsOn: "2026-07-25T16:00:00.000Z",
    });
    expect(
      isDateWithinTerm(midyear, new Date("2026-06-29T12:00:00+08:00")),
    ).toBe(true);
  });

  it("ignores stale local picks for undated terms during midyear", () => {
    const terms = [
      { ...term(1252), classCount: 4351 },
      { ...term(1253), classCount: 200 },
      { ...term(1251), classCount: 0 },
    ];
    const midyearDay = new Date("2026-06-29T08:00:00+08:00");

    expect(
      resolveInitialTermId(terms, {
        fromUrl: null,
        storedId: 1251,
        date: midyearDay,
      }),
    ).toBe(1253);
  });

  it("keeps a usable stored term during the same instructional window", () => {
    const terms = [
      { ...term(1252), classCount: 4351 },
      { ...term(1253), classCount: 200 },
      { ...term(1251), classCount: 0 },
    ];
    const midyearDay = new Date("2026-06-29T08:00:00+08:00");

    expect(
      resolveInitialTermId(terms, {
        fromUrl: null,
        storedId: 1253,
        date: midyearDay,
      }),
    ).toBe(1253);
  });
});

describe("isFinalsWeek", () => {
  it("detects 2nd sem finals window in Manila", () => {
    // Registrar finals-schedule PDF: 15–22 May 2026.
    expect(
      isFinalsWeek(new Date("2026-05-18T12:00:00+08:00"), term(1252)),
    ).toBe(true);
    expect(
      isFinalsWeek(new Date("2026-05-14T12:00:00+08:00"), term(1252)),
    ).toBe(false);
  });

  it("loads AY 2024-2025 windows from the academic calendar data", () => {
    expect(TERM_CALENDAR_WINDOWS[1241]).toEqual({
      startsOn: "2024-08-19",
      endsOn: "2024-12-20",
      finalsStartsOn: "2024-12-14",
      finalsEndsOn: "2024-12-20",
    });
  });

  it("loads AY 2026-2027 windows from the academic calendar data", () => {
    expect(TERM_CALENDAR_WINDOWS[1261]).toEqual({
      startsOn: "2026-08-03",
      endsOn: "2026-12-07",
      finalsStartsOn: "2026-12-01",
      finalsEndsOn: "2026-12-07",
    });
    expect(
      isFinalsWeek(new Date("2026-12-03T12:00:00+08:00"), term(1261)),
    ).toBe(true);
    expect(
      isFinalsWeek(new Date("2026-12-08T12:00:00+08:00"), term(1261)),
    ).toBe(false);
  });
});

describe("finalsWindowLabel", () => {
  it("formats the official window and handles unknown terms", () => {
    expect(finalsWindowLabel(1261)).toBe("Dec 1 – Dec 7");
    expect(finalsWindowLabel(1251)).toBeNull();
    expect(finalsWindowLabel(null)).toBeNull();
  });
});

describe("changeOfMatriculationLabel", () => {
  it("formats the last day for a known term", () => {
    expect(changeOfMatriculationLabel(1261)).toBe("August 7, 2026");
  });
  it("returns null for unknown terms / null", () => {
    expect(changeOfMatriculationLabel(1252)).toBeNull();
    expect(changeOfMatriculationLabel(null)).toBeNull();
  });
});
