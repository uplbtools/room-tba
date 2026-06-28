import { describe, expect, it } from "bun:test";
import { parseScheduleTime } from "@lib/schedule-renderer";

describe("parseScheduleTime", () => {
  it("parses AMIS-style compact times", () => {
    expect(parseScheduleTime("MW 07:00AM-08:00AM")).toEqual({
      days: "MW",
      time: "7-8",
    });
  });

  it("parses long single-day blocks", () => {
    expect(parseScheduleTime("M 09:00AM-03:00PM")).toEqual({
      days: "M",
      time: "9-3",
    });
  });

  it("parses Thursday combinations", () => {
    expect(parseScheduleTime("TTh 10:30AM-12:00PM")).toEqual({
      days: "TTh",
      time: "10:30-12",
    });
  });

  it("returns null for TBA", () => {
    expect(parseScheduleTime("TBA")).toBeNull();
  });
});
