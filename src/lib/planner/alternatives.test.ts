import { describe, expect, it } from "vitest";
import { alternativeOfferings } from "./alternatives.js";
import type { ClassMapValue } from "@lib/types";

function row(over: Partial<ClassMapValue>): ClassMapValue {
  return {
    courseCode: "CMSC 123",
    roomCode: null,
    section: "A",
    type: "LEC",
    schedule: ["MW 08:00AM-09:00AM"],
    directions: null,
    courseTitle: "Data Structures",
    roomId: null,
    termId: 1,
    id: 0,
    ...over,
  };
}

describe("alternativeOfferings", () => {
  const rows = [
    row({ section: "A", type: "LEC", id: 1 }),
    row({ section: "A", type: "LAB", id: 2 }),
    row({ section: "B", type: "LEC", id: 3 }),
    row({ section: "C", type: "LEC", id: 4 }),
    row({ courseCode: "MATH 55", section: "X", id: 5 }),
  ];

  it("returns other sections of the same course, excluding the current one", () => {
    const alts = alternativeOfferings(rows, "CMSC 123", "A");
    expect(alts.map((o) => o.section).sort()).toEqual(["B", "C"]);
  });

  it("keeps LEC+LAB grouped under one offering", () => {
    const alts = alternativeOfferings(
      [
        row({ section: "A", type: "LEC", id: 1 }),
        row({ section: "B", type: "LEC", id: 2 }),
        row({ section: "B", type: "LAB", id: 3 }),
      ],
      "CMSC 123",
      "A",
    );
    expect(alts).toHaveLength(1);
    expect(alts[0]?.sections).toHaveLength(2);
  });

  it("never offers a different course", () => {
    const alts = alternativeOfferings(rows, "CMSC 123", "A");
    expect(alts.every((o) => o.courseCode === "CMSC 123")).toBe(true);
  });

  it("drops rows with no section (solo rows)", () => {
    const alts = alternativeOfferings(
      [row({ section: null, id: 1 }), row({ section: "B", id: 2 })],
      "CMSC 123",
      "A",
    );
    expect(alts.map((o) => o.section)).toEqual(["B"]);
  });
});
