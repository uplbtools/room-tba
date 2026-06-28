import { describe, expect, it } from "bun:test";
import {
  amisExportContainsInstructorPii,
  sanitizeAmisRow,
} from "@lib/amis/sanitize-row";

describe("sanitizeAmisRow", () => {
  it("removes nested faculty user names", () => {
    const sanitized = sanitizeAmisRow({
      course_code: "CMSC 123",
      section: "A",
      class_dates: [
        {
          date: "MW",
          start_time: "07:00 AM",
          end_time: "08:00 AM",
          faculty: {
            faculty_id: 2535,
            user: {
              first_name: "ARIEL",
              last_name: "BOMBIO",
              formatted_name: "BOMBIO, ARIEL MANOPLA.",
            },
          },
        },
      ],
    });

    expect(JSON.stringify(sanitized)).not.toContain("BOMBIO");
    expect(JSON.stringify(sanitized)).not.toContain("formatted_name");
    expect(sanitized.class_dates?.[0]).toEqual({
      date: "MW",
      start_time: "07:00 AM",
      end_time: "08:00 AM",
    });
  });

  it("keeps schedule and facility fields", () => {
    const sanitized = sanitizeAmisRow({
      course_code: "HK 12",
      section: "AB",
      facility_id: "PSLH A",
      course: { title: "Physical Education" },
    });

    expect(sanitized).toEqual({
      course_code: "HK 12",
      section: "AB",
      facility_id: "PSLH A",
      course: { title: "Physical Education" },
    });
  });
});

describe("amisExportContainsInstructorPii", () => {
  it("detects unsanitized exports", () => {
    expect(
      amisExportContainsInstructorPii({
        classes: [{ faculty: { user: { first_name: "A" } } }],
      }),
    ).toBe(true);
    expect(
      amisExportContainsInstructorPii({
        classes: [{ course_code: "CMSC 123", last_name: "DOE" }],
      }),
    ).toBe(true);
    expect(
      amisExportContainsInstructorPii({
        classes: [{ course_code: "CMSC 123" }],
      }),
    ).toBe(false);
  });
});
