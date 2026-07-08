import { describe, expect, test } from "vitest";
import {
  groupClassesByOffering,
  parentLectureSection,
  missingParentLectures,
} from "./class-offering-groups.js";
import type { ClassMapValue } from "@lib/types";

const row = (overrides: Partial<ClassMapValue>): ClassMapValue => ({
  id: 1,
  courseCode: "CMSC 12",
  section: "G",
  type: "LEC",
  schedule: ["WF 04:00PM-05:00PM"],
  roomCode: "EAA LH",
  directions: null,
  courseTitle: "Foundations of Computer Science",
  roomId: 1,
  termId: 1252,
  ...overrides,
});

describe("parentLectureSection", () => {
  test("maps lab section names to their parent lecture section", () => {
    expect(parentLectureSection(row({ section: "G-1L", type: "LAB" }))).toBe(
      "G",
    );
    expect(parentLectureSection(row({ section: "ST11L", type: "LAB" }))).toBe(
      "ST1",
    );
    expect(parentLectureSection(row({ section: "A2-7L", type: "LAB" }))).toBe(
      "A2",
    );
  });

  test("maps recit section names to their parent lecture (any type)", () => {
    // Recits use an R suffix and a multi-letter lecture prefix (UV); they are
    // not typed "LAB" but must still resolve to their parent lecture.
    expect(parentLectureSection(row({ section: "UV-1R", type: "REC" }))).toBe(
      "UV",
    );
    expect(parentLectureSection(row({ section: "G-2R", type: "RECIT" }))).toBe(
      "G",
    );
    expect(parentLectureSection(row({ section: "ST11R", type: "REC" }))).toBe(
      "ST1",
    );
  });

  test("returns null for standalone lecture/seminar sections", () => {
    expect(parentLectureSection(row({ section: "G", type: "LEC" }))).toBeNull();
    expect(
      parentLectureSection(row({ section: "UV", type: "LEC" })),
    ).toBeNull();
  });
});

describe("missingParentLectures", () => {
  test("reports a lab's parent lecture when it's not in the set (other room)", () => {
    const result = missingParentLectures([
      row({ id: 2, section: "G-1L", type: "LAB", roomCode: "ICS PC2" }),
    ]);
    expect(result).toEqual([{ courseCode: "CMSC 12", section: "G" }]);
  });

  test("reports nothing when the parent lecture is already present", () => {
    const result = missingParentLectures([
      row({ id: 1, section: "G", type: "LEC" }),
      row({ id: 2, section: "G-1L", type: "LAB" }),
    ]);
    expect(result).toEqual([]);
  });

  test("dedupes across multiple labs sharing a lecture", () => {
    const result = missingParentLectures([
      row({ id: 2, section: "G-1L", type: "LAB" }),
      row({ id: 3, section: "G-5L", type: "LAB" }),
      row({ id: 4, section: "UV-1R", type: "REC", courseCode: "SPCM 1" }),
    ]);
    expect(result).toEqual([
      { courseCode: "CMSC 12", section: "G" },
      { courseCode: "SPCM 1", section: "UV" },
    ]);
  });
});

describe("groupClassesByOffering", () => {
  test("adds the parent lecture row to each lab offering", () => {
    const groups = groupClassesByOffering([
      row({ id: 1, section: "G", type: "LEC" }),
      row({ id: 2, section: "G-1L", type: "LAB" }),
      row({ id: 3, section: "G-5L", type: "LAB" }),
    ]);

    expect(groups.map((group) => group.section)).toEqual(["G-1L", "G-5L"]);
    expect(groups[0]?.sections.map((section) => section.section)).toEqual([
      "G",
      "G-1L",
    ]);
    expect(groups[1]?.sections.map((section) => section.section)).toEqual([
      "G",
      "G-5L",
    ]);
  });

  test("adds the parent lecture row to each recit offering", () => {
    const groups = groupClassesByOffering([
      row({ id: 1, courseCode: "SPCM 1", section: "UV", type: "LEC" }),
      row({ id: 2, courseCode: "SPCM 1", section: "UV-1R", type: "REC" }),
      row({ id: 3, courseCode: "SPCM 1", section: "UV-2R", type: "REC" }),
    ]);

    // The standalone lecture group is folded into its recits, not listed alone.
    expect(groups.map((group) => group.section)).toEqual(["UV-1R", "UV-2R"]);
    expect(groups[0]?.sections.map((s) => s.section)).toEqual(["UV", "UV-1R"]);
    expect(groups[1]?.sections.map((s) => s.section)).toEqual(["UV", "UV-2R"]);
  });
});
