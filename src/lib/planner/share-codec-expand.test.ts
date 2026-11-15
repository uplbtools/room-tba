import { describe, expect, test } from "bun:test";
import type { ClassMapValue } from "@lib/types";
import { expandSharedRefs } from "./share-codec.js";

let nextId = 1;
const row = (
  courseCode: string,
  section: string,
  type: string,
): ClassMapValue => ({
  id: nextId++,
  courseCode,
  section,
  type,
  schedule: ["TBA"],
  roomCode: null,
  directions: null,
  courseTitle: null,
  roomId: null,
  termId: 1261,
});

const rows = [
  row("CMSC 124", "S", "LEC"),
  row("CMSC 124", "S-1L", "LAB"),
  row("CMSC 124", "S-2L", "LAB"),
  row("NRC 140", "Y", "LEC"),
  row("NRC 140", "Y1L", "LAB"),
];

describe("expandSharedRefs", () => {
  test("keeps typed refs as they are", () => {
    const ref = { courseCode: "CMSC 124", section: "S", type: "LEC" };
    expect(expandSharedRefs([ref], rows)).toEqual([ref]);
  });

  test("an untyped ref takes the type of its section", () => {
    const refs = [
      { courseCode: "NRC 140", section: "Y", type: "" },
      { courseCode: "NRC 140", section: "Y1L", type: "" },
    ];
    expect(expandSharedRefs(refs, rows)).toEqual([
      { courseCode: "NRC 140", section: "Y", type: "LEC" },
      { courseCode: "NRC 140", section: "Y1L", type: "LAB" },
    ]);
  });

  test("a ref with no section takes the first lecture and its lab", () => {
    const refs = [{ courseCode: "CMSC 124", section: "", type: "" }];
    expect(expandSharedRefs(refs, rows)).toEqual([
      { courseCode: "CMSC 124", section: "S", type: "LEC" },
      { courseCode: "CMSC 124", section: "S-1L", type: "LAB" },
    ]);
  });

  test("an unknown section stays so it shows as a stale row", () => {
    const ref = { courseCode: "CMSC 199", section: "CD", type: "" };
    expect(expandSharedRefs([ref], rows)).toEqual([ref]);
  });
});
