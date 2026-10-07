import { describe, expect, it } from "bun:test";
import {
  formatMinutesRange,
  formatScheduleShort,
  formatSectionType,
} from "./format.js";

describe("formatScheduleShort", () => {
  it("drops leading zeros and repeats the period only when it changes", () => {
    expect(formatScheduleShort("WF 04:00PM-05:00PM")).toBe("WF 4–5 PM");
    expect(formatScheduleShort("T 07:00AM-10:00AM")).toBe("T 7–10 AM");
    expect(formatScheduleShort("WF 11:30AM-01:00PM")).toBe("WF 11:30 AM–1 PM");
  });

  it("writes Thursday as Th and passes TBA through", () => {
    expect(formatScheduleShort("TH 07:00AM-10:00AM")).toBe("Th 7–10 AM");
    expect(formatScheduleShort("TBA")).toBe("TBA");
  });
});

describe("formatMinutesRange", () => {
  it("formats noon and half hours", () => {
    expect(formatMinutesRange(8 * 60 + 30, 10 * 60)).toBe("8:30–10 AM");
    expect(formatMinutesRange(12 * 60, 13 * 60)).toBe("12–1 PM");
  });
});

describe("formatSectionType", () => {
  it("title-cases AMIS component types", () => {
    expect(formatSectionType("LEC")).toBe("Lec");
    expect(formatSectionType("LAB")).toBe("Lab");
    expect(formatSectionType("RCT")).toBe("Recit");
    expect(formatSectionType(null)).toBe("Class");
  });
});
