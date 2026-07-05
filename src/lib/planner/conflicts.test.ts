import { describe, expect, it } from "bun:test";
import { findConflicts, isUnscheduled, sectionBlocks } from "./conflicts.js";
import type { PlannedSection } from "./types.js";

const section = (
  overrides: Partial<PlannedSection> & Pick<PlannedSection, "schedule">,
): PlannedSection => ({
  courseCode: "CMSC 128",
  section: "AB-1L",
  type: "LEC",
  roomCode: null,
  courseTitle: null,
  ...overrides,
});

describe("sectionBlocks", () => {
  it("expands multi-day strings into per-day blocks", () => {
    const blocks = sectionBlocks(
      section({ schedule: ["MWF 08:00AM-09:00AM"] }),
    );
    expect(blocks.map((b) => b.dayIndex)).toEqual([0, 2, 4]);
    expect(blocks[0]).toMatchObject({ startMin: 480, endMin: 540 });
  });

  it("returns no blocks for TBA or unparseable strings", () => {
    expect(sectionBlocks(section({ schedule: ["TBA"] }))).toEqual([]);
    expect(sectionBlocks(section({ schedule: ["W 1-2:30"] }))).toEqual([]);
    expect(isUnscheduled(section({ schedule: ["TBA"] }))).toBe(true);
  });
});

describe("findConflicts", () => {
  it("flags same-day overlapping sections", () => {
    const conflicts = findConflicts([
      section({ schedule: ["MW 08:00AM-09:30AM"] }),
      section({
        courseCode: "MATH 27",
        section: "B-2",
        schedule: ["M 09:00AM-10:00AM"],
      }),
    ]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].a.dayIndex).toBe(0);
    expect(conflicts[0].b.courseCode).toBe("MATH 27");
  });

  it("does not flag touching boundaries", () => {
    expect(
      findConflicts([
        section({ schedule: ["M 08:00AM-09:00AM"] }),
        section({
          courseCode: "MATH 27",
          schedule: ["M 09:00AM-10:00AM"],
        }),
      ]),
    ).toEqual([]);
  });

  it("does not flag different days (T vs Th)", () => {
    expect(
      findConflicts([
        section({ schedule: ["T 08:00AM-09:00AM"] }),
        section({
          courseCode: "MATH 27",
          schedule: ["Th 08:00AM-09:00AM"],
        }),
      ]),
    ).toEqual([]);
  });

  it("never conflicts a section with itself", () => {
    expect(
      findConflicts([
        section({ schedule: ["M 08:00AM-09:00AM", "M 08:00AM-09:00AM"] }),
      ]),
    ).toEqual([]);
  });

  it("TBA sections never conflict", () => {
    expect(
      findConflicts([
        section({ schedule: ["TBA"] }),
        section({ courseCode: "MATH 27", schedule: ["TBA"] }),
      ]),
    ).toEqual([]);
  });
});
