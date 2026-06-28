import { describe, expect, it } from "bun:test";
import { extractClassRows, normalizeAmisClass } from "@lib/amis/normalize-class";

describe("amis normalize", () => {
  it("unwraps nested classes.data payloads", () => {
    const rows = extractClassRows({
      classes: {
        data: [{ course_code: "CMSC 123", section: "A" }],
        total: 1,
      },
    });
    expect(rows).toHaveLength(1);
  });

  it("maps legacy AMIS export rows", () => {
    const normalized = normalizeAmisClass(
      {
        course_code: "HK 12",
        section: "AB",
        type: "LEC",
        activity: "Dance",
        facility_id: "PSLH A",
        term_id: 1252,
        course: { title: "Physical Education" },
        class_dates: [
          {
            date: "MW",
            start_time: "07:00 AM",
            end_time: "08:00 AM",
          },
        ],
      },
      1252,
    );

    expect(normalized).toEqual({
      courseCode: "HK 12",
      section: "AB",
      type: "LEC",
      courseTitle: "Physical Education (Dance)",
      schedule: ["MW 07:00AM-08:00AM"],
      termId: 1252,
      facilityCode: "PSLH A",
    });
  });
});
