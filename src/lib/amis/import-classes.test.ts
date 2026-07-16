import { describe, expect, test } from "bun:test";
import {
  buildRoomLookup,
  classNaturalKey,
  formatImportReport,
  matchRoomId,
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

  test("flags DB rooms that collapse to the same squashed key", () => {
    const lookup = buildRoomLookup(
      [
        { id: 1, code: "BALH 1" },
        { id: 2, code: "BALH1" },
      ],
      [],
    );
    expect(lookup.squashedRoomIdByKey.get("BALH1")).toBeNull();
    expect(lookup.duplicateRoomCodes.get("BALH1")).toEqual(["BALH 1", "BALH1"]);
  });
});

describe("matchRoomId", () => {
  const lookup = buildRoomLookup(
    [
      { id: 1, code: "IBSLH2" },
      { id: 2, code: "CHE Conference Room" },
      { id: 3, code: "EAA LH" },
      { id: 4, code: "FRONDA RM. 24" },
      { id: 5, code: "BALH 1" },
      { id: 6, code: "BALH1" },
    ],
    [{ alias: "MEGA HALL", targetId: 3 }],
  );

  test("exact after dash/dot normalization", () => {
    expect(matchRoomId(lookup, "FRONDA RM 24")).toEqual({
      roomId: 4,
      kind: "direct",
    });
  });

  test("alias table match", () => {
    expect(matchRoomId(lookup, "Mega Hall")).toEqual({
      roomId: 3,
      kind: "alias",
    });
  });

  test("spacing variants via squashed key", () => {
    expect(matchRoomId(lookup, "IBSLH 2")).toEqual({
      roomId: 1,
      kind: "fuzzy",
    });
  });

  test("abbreviation expansion", () => {
    expect(matchRoomId(lookup, "CHE CONF RM")).toEqual({
      roomId: 2,
      kind: "fuzzy",
    });
  });

  test("parenthetical suffix stripped", () => {
    expect(matchRoomId(lookup, "EAA LH (ICS Mega Hall)")).toEqual({
      roomId: 3,
      kind: "direct",
    });
  });

  test("ambiguous squashed key does not match", () => {
    expect(matchRoomId(lookup, "BA LH1")).toBeNull();
  });

  test("unknown room returns null", () => {
    expect(matchRoomId(lookup, "MAQUILING ROOM 22")).toBeNull();
  });

  test("registrar column bleed takes the last segment", () => {
    expect(matchRoomId(lookup, "CHEM 161B    FRONDA RM 24")).toEqual({
      roomId: 4,
      kind: "direct",
    });
  });

  test("AMIS 10-char truncation completes to a unique room", () => {
    const truncLookup = buildRoomLookup([{ id: 9, code: "ASILH B125" }], []);
    expect(matchRoomId(truncLookup, "ASILH B-12")).toEqual({
      roomId: 9,
      kind: "fuzzy",
    });
    // ambiguous completion stays unmatched
    const ambiguous = buildRoomLookup(
      [
        { id: 1, code: "IMSP PC203" },
        { id: 2, code: "IMSP PC204" },
      ],
      [],
    );
    expect(matchRoomId(ambiguous, "IMSP PC20")).toBeNull();
  });

  test("slash combo falls back to the room before the slash", () => {
    const slashLookup = buildRoomLookup([{ id: 7, code: "ICROPS 134" }], []);
    expect(matchRoomId(slashLookup, "ICROPS 134/AVR")).toEqual({
      roomId: 7,
      kind: "fuzzy",
    });
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
    expect(stats.skippedUnknownType).toBe(1);
    expect(stats.importedRoomless).toBe(0);
    expect(stats.missingFacility).toBe(0);
  });

  test("imports RCT (recitation) as a room-scheduled type", () => {
    const lookup = buildRoomLookup([{ id: 7, code: "ASI B-126" }], []);
    const { stats, rows } = resolveImportRows(
      [
        {
          courseCode: "AGRI 61",
          section: "AB1R",
          type: "RCT",
          courseTitle: "Fundamentals of Agricultural Extension Communication",
          schedule: ["W 09:00AM-10:00AM"],
          facilityCode: "ASI B-126",
          termId: 1261,
        },
      ],
      lookup,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.type).toBe("RCT");
    expect(rows[0]?.roomId).toBe(7);
    expect(stats.directRoomMatch).toBe(1);
    expect(stats.skippedUnknownType).toBe(0);
  });

  test("imports roomless thesis and special-problem types with null room", () => {
    const lookup = buildRoomLookup([], []);
    const { stats, rows } = resolveImportRows(
      [
        {
          courseCode: "CMSC 199",
          section: "A",
          type: "THE",
          courseTitle: "Undergraduate Thesis",
          schedule: [],
          facilityCode: "",
          termId: 1252,
        },
        {
          courseCode: "CMSC 190",
          section: "B",
          type: "SPR",
          courseTitle: "Special Problem",
          schedule: ["TBA"],
          facilityCode: "",
          termId: 1252,
        },
      ],
      lookup,
    );

    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.roomId)).toEqual([null, null]);
    expect(stats.importedRoomless).toBe(2);
    expect(stats.missingFacility).toBe(0);
    expect(stats.unmatchedFacility).toBe(0);
  });

  test("keeps scheduled rows even when the room is missing or unmatched", () => {
    const lookup = buildRoomLookup([], []);
    const { stats, rows } = resolveImportRows(
      [
        {
          courseCode: "CMSC 12",
          section: "G",
          type: "LEC",
          courseTitle: "Foundations of Computer Science",
          schedule: ["WF 4-5"],
          facilityCode: "EAA LH",
          termId: 1252,
        },
        {
          courseCode: "CMSC 12",
          section: "G-1L",
          type: "LAB",
          courseTitle: "Foundations of Computer Science",
          schedule: ["T 7-10"],
          facilityCode: "",
          termId: 1252,
        },
      ],
      lookup,
    );

    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.roomId)).toEqual([null, null]);
    expect(stats.unmatchedFacility).toBe(1);
    expect(stats.missingFacility).toBe(1);
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
        fuzzyRoomMatch: 0,
        missingFacility: 30,
        unmatchedFacility: 10,
        importedRoomless: 8,
        skippedUnknownType: 2,
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
    expect(report).toContain("Imported roomless (THE/SPR/…): 8");
    expect(report).toContain("Skipped unknown type: 2");
    expect(report).toContain("LEC/LAB missing facility: 30");
    expect(report).toContain("+3 ~2 =35 -1");
  });
});
