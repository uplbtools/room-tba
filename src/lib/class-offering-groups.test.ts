import { describe, expect, test } from "vitest";
import {
  groupClassesByOffering,
  parentLectureSection,
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
});
