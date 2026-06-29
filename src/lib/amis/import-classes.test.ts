import { describe, expect, test } from "bun:test";
import {
  buildRoomLookup,
  classNaturalKey,
  formatImportReport,
  resolveImportRows,
  summarizeImportChanges,
} from "./import-classes";

describe("classNaturalKey", () => {
  test("normalizes case and whitespace", () => {
    expect(
      classNaturalKey({
        termId: 1252,
        courseCode: " eng 1 ",
        section: " ab ",
        type: "lec",
      }),
    ).toBe("1252|ENG 1|AB|LEC");
  });
});

describe("buildRoomLookup", () => {
  test("maps room codes and aliases", () => {
    const lookup = buildRoomLookup(
      [{ id: 1, code: "PS B 203" }],
      [{ alias: "PS B-203", targetId: 1 }],
    );
    expect(lookup.directRoomIdByKey.get("PS B 203")).toBe(1);
    expect(lookup.aliasRoomIdByKey.get("PS B 203")).toBe(1);
    expect(lookup.combinedRoomIdByKey.get("PS B 203")).toBe(1);
  });
});

describe("resolveImportRows", () => {
  test("counts direct and alias matches separately", () => {
    const lookup = buildRoomLookup(
      [{ id: 10, code: "PS B 203" }],
      [{ alias: "PSB203", targetId: 10 }],
    );
    const { stats, rows } = resolveImportRows(
      [
        {
          courseCode: "ENG 1",
          section: "AB",
          type: "LEC",
          courseTitle: "English",
          schedule: ["MWF 8-9"],
          facilityCode: "PS B 203",
          termId: 1252,
        },
        {
          courseCode: "ENG 2",
          section: "CD",
          type: "LAB",
          courseTitle: "English 2",
          schedule: ["TTH 1-4"],
          facilityCode: "PSB203",
          termId: 1252,
        },
        {
          courseCode: "THESIS",
          section: "A",
          type: "THS",
          courseTitle: "Thesis",
          schedule: [],
          facilityCode: "",
          termId: 1252,
        },
      ],
      lookup,
    );

    expect(rows).toHaveLength(2);
    expect(stats.directRoomMatch).toBe(1);
    expect(stats.aliasRoomMatch).toBe(1);
    expect(stats.skippedByType).toBe(1);
    expect(stats.missingFacility).toBe(0);
  });
});

describe("summarizeImportChanges", () => {
  test("detects insert, update, unchanged, and stale removal", () => {
    const existingByKey = new Map([
      [
        "1252|ENG 1|AB|LEC",
        {
          id: 1,
          courseCode: "ENG 1",
          section: "AB",
          type: "LEC",
          courseTitle: "Old title",
          schedule: ["MWF 8-9"],
          roomId: 10,
        },
      ],
      [
        "1252|ENG 2|CD|LAB",
        {
          id: 2,
          courseCode: "ENG 2",
          section: "CD",
          type: "LAB",
          courseTitle: "English 2",
          schedule: ["TTH 1-4"],
          roomId: 11,
        },
      ],
    ]);

    const { summary, inserts, updates, removeIds } = summarizeImportChanges({
      replaceTerm: true,
      existingKeys: new Set(existingByKey.keys()),
      existingByKey,
      incomingRows: [
        {
          courseCode: "ENG 1",
          section: "AB",
          type: "LEC",
          courseTitle: "English 1",
          schedule: ["MWF 8-9"],
          roomId: 10,
          termId: 1252,
        },
        {
          courseCode: "ENG 3",
          section: "EF",
          type: "LEC",
          courseTitle: "English 3",
          schedule: ["MWF 10-11"],
          roomId: 12,
          termId: 1252,
        },
      ],
    });

    expect(summary).toEqual({
      inserted: 1,
      updated: 1,
      unchanged: 0,
      removed: 1,
    });
    expect(inserts).toHaveLength(1);
    expect(updates).toHaveLength(1);
    expect(removeIds).toEqual([2]);
  });
});

describe("formatImportReport", () => {
  test("includes categorized counts", () => {
    const report = formatImportReport({
      termId: 1252,
      rawCount: 100,
      normalizedCount: 95,
      stats: {
        directRoomMatch: 40,
        aliasRoomMatch: 5,
        missingFacility: 30,
        unmatchedFacility: 10,
        skippedByType: 10,
      },
      summary: {
        inserted: 3,
        updated: 2,
        unchanged: 35,
        removed: 1,
      },
      unmatched: new Map([
        ["(missing facility)", 30],
        ["PSLH-Z", 10],
      ]),
    });

    expect(report).toContain("direct, 5 via alias");
    expect(report).toContain("Missing facility: 30");
    expect(report).toContain("+3 ~2 =35 -1");
  });
});
