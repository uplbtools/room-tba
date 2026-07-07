import { describe, expect, it } from "bun:test";
import { parseDays, parseScheduleTime } from "@lib/schedule-renderer";

describe("parseScheduleTime", () => {
  it("parses AMIS-style compact times", () => {
    expect(parseScheduleTime("MW 07:00AM-08:00AM")).toEqual({
      days: "MW",
      time: "7-8",
      startMinutes: 7 * 60,
      endMinutes: 8 * 60,
    });
  });

  it("parses long single-day blocks", () => {
    expect(parseScheduleTime("M 09:00AM-03:00PM")).toEqual({
      days: "M",
      time: "9-3",
      startMinutes: 9 * 60,
      endMinutes: 15 * 60,
    });
  });

  it("parses Thursday combinations", () => {
    expect(parseScheduleTime("TTh 10:30AM-12:00PM")).toEqual({
      days: "TTh",
      time: "10:30-12",
      startMinutes: 10 * 60 + 30,
      endMinutes: 12 * 60,
    });
  });

  it("handles 12 AM/PM edge cases in minutes", () => {
    expect(parseScheduleTime("F 12:00PM-01:00PM")).toMatchObject({
      startMinutes: 12 * 60,
      endMinutes: 13 * 60,
    });
  });

  it("returns null for TBA", () => {
    expect(parseScheduleTime("TBA")).toBeNull();
  });

  it("returns null for unrecognized formats", () => {
    expect(parseScheduleTime("Th 1:00-4:00 PM")).toBeNull();
  });
});

describe("parseDays", () => {
  it("keeps Monday when sorting", () => {
    expect(parseDays("WM")).toEqual([0, 2]);
  });

  it("separates T and Th", () => {
    expect(parseDays("TTh")).toEqual([1, 3]);
  });

  it("parses MWF", () => {
    expect(parseDays("MWF")).toEqual([0, 2, 4]);
  });

  it("ignores unknown characters", () => {
    expect(parseDays("XZ")).toEqual([]);
  });
});
