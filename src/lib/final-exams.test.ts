import { describe, expect, it } from "bun:test";
import {
  normalizeCourseCode,
  normalizeFinalExamRow,
  parseExamDate,
  parseExamTime,
} from "./final-exams/normalize";

describe("final-exams normalize", () => {
  it("parses ISO exam dates", () => {
    expect(parseExamDate("2026-05-15")).toBe("2026-05-15");
  });

  it("parses slash dates as Manila calendar days", () => {
    expect(parseExamDate("5/15/2026")).toBe("2026-05-15");
  });

  it("parses 24h and AM/PM times", () => {
    expect(parseExamTime("08:00")).toBe("08:00:00");
    expect(parseExamTime("1:30 PM")).toBe("13:30:00");
    expect(parseExamTime("12:00 AM")).toBe("00:00:00");
  });

  it("normalizes a complete import row", () => {
    const row = normalizeFinalExamRow({
      course_code: "cmsc 130",
      section: "A-1L",
      course_title: "Intro to Computing",
      room_code: "ICS L105",
      exam_date: "2026-05-15",
      starts_at: "8:00 AM",
      ends_at: "10:00",
    });

    expect(row).toEqual({
      courseCode: "CMSC 130",
      section: "A-1L",
      courseTitle: "Intro to Computing",
      facilityCode: "ICS L105",
      examDate: "2026-05-15",
      startsAt: "08:00:00",
      endsAt: "10:00:00",
    });
  });

  it("rejects rows missing required fields", () => {
    expect(
      normalizeFinalExamRow({
        course_code: "MATH 27",
        exam_date: "2026-05-15",
        starts_at: "08:00",
      }),
    ).toBeNull();
  });

  it("normalizes course codes to uppercase", () => {
    expect(normalizeCourseCode(" math 27 ")).toBe("MATH 27");
  });
});
