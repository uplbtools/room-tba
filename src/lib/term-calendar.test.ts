import { describe, expect, it } from "bun:test";
import {
  isDateWithinTerm,
  resolveActiveTermByDate,
  resolveInitialTermId,
  TERM_CALENDAR_WINDOWS,
} from "./term-calendar";
import type { Term } from "./types";

function term(id: number, overrides: Partial<Term> = {}): Term {
  const window = TERM_CALENDAR_WINDOWS[id];
  return {
    id,
    label: `Term ${id}`,
    schoolYear: "2025-2026",
    semester: id === 1252 ? "midyear" : String(id - 1250),
    startsOn: window?.startsOn ?? null,
    endsOn: window?.endsOn ?? null,
    isDefault: id === 1252,
    isActive: true,
    sortOrder: id,
    version: 1,
    updatedAt: "2026-01-01",
    ...overrides,
  };
}

describe("term-calendar", () => {
  it("detects midyear from Manila calendar date", () => {
    const midyear = term(1252);
    expect(isDateWithinTerm(midyear, new Date("2026-06-29T12:00:00+08:00"))).toBe(
      true,
    );
    expect(isDateWithinTerm(midyear, new Date("2026-08-01T12:00:00+08:00"))).toBe(
      false,
    );
  });

  it("resolves the in-session term for today", () => {
    const terms = [term(1251), term(1252), term(1253)];
    expect(
      resolveActiveTermByDate(terms, new Date("2026-06-29T08:00:00+08:00"))?.id,
    ).toBe(1252);
    expect(
      resolveActiveTermByDate(terms, new Date("2026-03-15T08:00:00+08:00"))?.id,
    ).toBe(1253);
  });

  it("handles postgres timestamp strings in UTC", () => {
    const midyear = term(1252, {
      startsOn: "2026-06-07T16:00:00.000Z",
      endsOn: "2026-07-25T16:00:00.000Z",
    });
    expect(isDateWithinTerm(midyear, new Date("2026-06-29T12:00:00+08:00"))).toBe(
      true,
    );
  });

  it("ignores stale local picks for undated terms during midyear", () => {
    const terms = [
      { ...term(1253), classCount: 4351 },
      { ...term(1252), classCount: 0 },
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
      { ...term(1253), classCount: 4351 },
      { ...term(1252), classCount: 0 },
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
