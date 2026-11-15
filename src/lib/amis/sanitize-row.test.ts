import { describe, expect, it } from "bun:test";
import {
  amisExportContainsInstructorPii,
  nameToInitials,
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

describe("nameToInitials", () => {
  it("reads first-last and last-comma-first order the same way", () => {
    expect(nameToInitials("Juan P. Dela Cruz")).toBe("JPDC");
    expect(nameToInitials("DELA CRUZ, JUAN P.")).toBe("JPDC");
    expect(nameToInitials("SANTOS, MARIA DE LOS REYES")).toBe("MDLRS");
    expect(nameToInitials("RAMOS, ANA SAN JOSE, JR.")).toBe("ASJR");
  });

  it("gives null for blank or TBA", () => {
    expect(nameToInitials("")).toBeNull();
    expect(nameToInitials("  TBA ")).toBeNull();
  });
});

describe("sanitizeAmisRow instructor initials", () => {
  const faculty = (formatted_name: string) => ({
    faculty: { user: { formatted_name } },
  });

  it("keeps initials in AMIS order and drops the names", () => {
    const sanitized = sanitizeAmisRow({
      course_code: "CMSC 123",
      section: "A",
      class_dates: [
        { date: "MW", ...faculty("BOMBIO, ARIEL MANOPLA.") },
        { date: "F", ...faculty("DELA CRUZ, JUAN P.") },
        { date: "Th", ...faculty("BOMBIO, ARIEL MANOPLA.") },
      ],
    });
    expect(sanitized.instructor_initials).toBe("AMB, JPDC");
    expect(JSON.stringify(sanitized)).not.toMatch(/BOMBIO|CRUZ/);
  });

  it("reads first, middle and last name fields", () => {
    const sanitized = sanitizeAmisRow({
      section: "B",
      faculty: {
        user: { first_name: "Juan", middle_name: "P.", last_name: "Dela Cruz" },
      },
    });
    expect(sanitized.instructor_initials).toBe("JPDC");
  });

  it("sets nothing for a TBA instructor", () => {
    const sanitized = sanitizeAmisRow({
      section: "C",
      class_dates: [{ date: "MW", ...faculty("TBA") }],
    });
    expect("instructor_initials" in sanitized).toBe(false);
  });

  it("sanitizes the embedded parent lecture and survives a second pass", () => {
    const once = sanitizeAmisRow({
      section: "A-1L",
      parent: { id: 1, section: "A", ...faculty("DELA CRUZ, JUAN P.") },
    });
    expect(once.parent).toEqual({
      id: 1,
      section: "A",
      instructor_initials: "JPDC",
    });
    expect(sanitizeAmisRow(once)).toEqual(once);
    expect(amisExportContainsInstructorPii(once)).toBe(false);
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
