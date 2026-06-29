import { describe, expect, it } from "bun:test";
import {
  formatMinutes,
  orderDayStops,
  parseSlotMinutes,
  scheduleSlotOnWeekday,
  tokenizeScheduleDays,
} from "./day-stops";
import type { ScheduleMatchResult } from "./types";

describe("tokenizeScheduleDays", () => {
  it("splits T and Th correctly", () => {
    expect(tokenizeScheduleDays("TTh")).toEqual(["T", "Th"]);
    expect(tokenizeScheduleDays("MWF")).toEqual(["M", "W", "F"]);
  });
});

describe("scheduleSlotOnWeekday", () => {
  it("matches Tuesday but not Thursday for T slot", () => {
    expect(scheduleSlotOnWeekday("T 10:00AM-11:00AM", "T")).toBe(true);
    expect(scheduleSlotOnWeekday("T 10:00AM-11:00AM", "Th")).toBe(false);
  });

  it("matches Thursday for TTh slot", () => {
    expect(scheduleSlotOnWeekday("TTh 01:00PM-02:30PM", "Th")).toBe(true);
  });
});

describe("parseSlotMinutes", () => {
  it("parses AM and PM boundaries", () => {
    expect(parseSlotMinutes("MW 07:00AM-08:00AM")).toEqual({
      startMinutes: 7 * 60,
      endMinutes: 8 * 60,
    });
    expect(parseSlotMinutes("M 09:00AM-03:00PM")).toEqual({
      startMinutes: 9 * 60,
      endMinutes: 15 * 60,
    });
  });
});

describe("orderDayStops", () => {
  const baseMatch = (
    overrides: Partial<ScheduleMatchResult>,
  ): ScheduleMatchResult => ({
    row: {
      courseCode: "CMSC 123",
      section: "A",
      type: "LEC",
      schedule: ["MW 08:00AM-09:00AM"],
    },
    matchedClassId: 1,
    roomCode: "ICS 314",
    coords: [121.077, 14.135],
    unresolvedReason: null,
    ...overrides,
  });

  it("orders stops by start time and computes gaps", () => {
    const matches: ScheduleMatchResult[] = [
      baseMatch({
        row: {
          courseCode: "CMSC 170",
          section: "B",
          type: "LAB",
          schedule: ["M 01:00PM-04:00PM"],
        },
        roomCode: "ICS 316",
        coords: [121.078, 14.136],
      }),
      baseMatch({
        row: {
          courseCode: "CMSC 123",
          section: "A",
          type: "LEC",
          schedule: ["M 08:00AM-09:00AM"],
        },
      }),
    ];

    const stops = orderDayStops(matches, "M");
    expect(stops).toHaveLength(2);
    expect(stops[0].courseCode).toBe("CMSC 123");
    expect(stops[1].courseCode).toBe("CMSC 170");
    expect(stops[0].gapMinutesAfter).toBe(4 * 60);
  });

  it("skips unresolved rows", () => {
    const stops = orderDayStops(
      [
        baseMatch({
          coords: null,
          unresolvedReason: "No room",
        }),
      ],
      "M",
    );
    expect(stops).toHaveLength(0);
  });
});

describe("formatMinutes", () => {
  it("formats noon and half hours", () => {
    expect(formatMinutes(12 * 60)).toBe("12 PM");
    expect(formatMinutes(13 * 60 + 30)).toBe("1:30 PM");
  });
});
