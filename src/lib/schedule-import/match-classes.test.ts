import { describe, expect, it } from "bun:test";
import { matchImportedScheduleRows } from "./match-classes";
import type { ClassMapValue } from "@lib/types";
import type { ImportedScheduleRow } from "./types";

const sampleClass: ClassMapValue = {
  id: 1,
  termId: 1252,
  roomId: 10,
  courseCode: "CMSC 123",
  roomCode: "ICS 314",
  section: "A",
  type: "LEC",
  schedule: ["MW 08:00AM-09:00AM"],
  directions: null,
  courseTitle: "Intro",
};

describe("matchImportedScheduleRows", () => {
  const row: ImportedScheduleRow = {
    courseCode: "CMSC 123",
    section: "A",
    type: "LEC",
    schedule: ["MW 08:00AM-09:00AM"],
  };

  it("matches course section type to institutional class", () => {
    const [result] = matchImportedScheduleRows([row], [sampleClass], () => [
      121.077, 14.135,
    ]);
    expect(result.matchedClassId).toBe(1);
    expect(result.roomCode).toBe("ICS 314");
    expect(result.coords).toEqual([121.077, 14.135]);
    expect(result.unresolvedReason).toBeNull();
  });

  it("marks missing sections unresolved", () => {
    const [result] = matchImportedScheduleRows([row], [], () => null);
    expect(result.unresolvedReason).toContain("No matching section");
  });

  it("skips thesis sections for routing", () => {
    const [result] = matchImportedScheduleRows(
      [{ ...row, type: "THE" }],
      [sampleClass],
      () => [121, 14],
    );
    expect(result.unresolvedReason).toContain("no fixed room");
  });

  it("flags rooms without coordinates", () => {
    const [result] = matchImportedScheduleRows(
      [row],
      [sampleClass],
      () => null,
    );
    expect(result.unresolvedReason).toContain("no map coordinates");
  });
});
