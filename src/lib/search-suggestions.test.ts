import { describe, expect, it } from "bun:test";
import {
  buildEntitySuggestions,
  enterAction,
  groupSuggestions,
  MATCH,
  matchHighlightRange,
  nameMatchScore,
  normalizeCourseQuery,
  rankSuggestions,
  scoreAliases,
  scoreClasses,
  scoreEntities,
  scoreRooms,
} from "./search-suggestions";
import type { BuildingData, ClassMapValue, OrgData } from "./types";

function building(name: string): BuildingData {
  return { buildingName: name, lat: 14.16, lon: 121.24 } as BuildingData;
}

function org(name: string): OrgData {
  return { name, description: null, lat: null, lon: null } as OrgData;
}

function section(
  courseCode: string,
  sectionName: string,
  roomCode: string | null,
): ClassMapValue {
  return {
    id: Math.random(),
    courseCode,
    section: sectionName,
    roomCode,
    type: "LEC",
    schedule: ["MW 08:00AM-09:00AM"],
    directions: null,
    courseTitle: null,
    roomId: null,
    termId: 1,
  };
}

const emptyData = {
  loaded: true,
  filteredBuildings: [] as BuildingData[],
  filteredDorms: [],
  colleges: [],
  divisions: [],
  events: [],
  organizations: [] as OrgData[],
  places: [],
};

describe("nameMatchScore", () => {
  it("scores exact names, codes, parenthesized and initial acronyms best", () => {
    expect(nameMatchScore("ICS", "ics")).toBe(MATCH.exact);
    expect(nameMatchScore("Institute of Computer Science (ICS)", "ics")).toBe(
      MATCH.exact,
    );
    expect(nameMatchScore("Institute of Computer Science", "ics")).toBe(
      MATCH.exact,
    );
    expect(nameMatchScore("PS 105", "ps105")).toBe(MATCH.exact);
    expect(nameMatchScore("ALH 28", "alh 28")).toBe(MATCH.exact);
  });

  it("ranks name prefix, then word prefix, then mid-word", () => {
    expect(nameMatchScore("Computer Science", "comp")).toBe(MATCH.prefix);
    expect(nameMatchScore("Institute of Computer Science", "comp")).toBe(
      MATCH.wordPrefix,
    );
    expect(nameMatchScore("College of Economics", "ics")).toBe(MATCH.midWord);
  });

  it("prefers a later word-start hit over an earlier mid-word one", () => {
    // "ps" first appears inside "ICroPS", then starts the word "PS".
    expect(nameMatchScore("ICROPS PS Annex", "ps")).toBe(MATCH.wordPrefix);
  });

  it("matches codes regardless of spacing", () => {
    expect(nameMatchScore("CMSC 123", "cmsc12")).toBe(MATCH.prefix);
  });

  it("misses cleanly", () => {
    expect(nameMatchScore("Baker Hall", "ics")).toBeNull();
    expect(nameMatchScore(undefined, "ics")).toBeNull();
    expect(nameMatchScore("Baker Hall", "")).toBeNull();
  });
});

describe("matchHighlightRange", () => {
  it("bolds only the matched characters at a word start", () => {
    expect(matchHighlightRange("CAS Annex 1", "cas")).toEqual([0, 3]);
    expect(
      matchHighlightRange("Institute of Computer Science", "Institute o"),
    ).toEqual([0, 11]);
  });

  it("never bolds mid-word hits (CHI EPSILON for PS)", () => {
    expect(
      matchHighlightRange("CHI EPSILON SORORITY (UP CE)", "ps"),
    ).toBeNull();
  });

  it("skips the closing bracket of a parenthesized acronym", () => {
    const label = "Institute of Computer Science (ICS)";
    const range = matchHighlightRange(label, "ics");
    expect(range).not.toBeNull();
    const [start, end] = range as [number, number];
    expect(label.slice(start, end)).toBe("ICS");
  });

  it("picks the word-start occurrence over an earlier mid-word one", () => {
    const label = "ICROPS PS Annex";
    const [start, end] = matchHighlightRange(label, "ps") as [number, number];
    expect(start).toBe(7);
    expect(end).toBe(9);
  });
});

describe("normalizeCourseQuery", () => {
  it("normalizes spacing and case", () => {
    expect(normalizeCourseQuery("cmsc12")).toBe("CMSC 12");
    expect(normalizeCourseQuery("  CMSC   12 ")).toBe("CMSC 12");
    expect(normalizeCourseQuery("hk 11a")).toBe("HK 11A");
  });

  it("rejects non-codes", () => {
    expect(normalizeCourseQuery("library")).toBeNull();
    expect(normalizeCourseQuery("ICS MH")).toBeNull();
  });
});

describe("buildEntitySuggestions", () => {
  it("ranks the ICS building above mid-word -ics- matches (prod bug)", () => {
    const suggestions = buildEntitySuggestions("ics", {
      ...emptyData,
      // Alphabetical data order used to fill the per-category cap with
      // mid-word matches before the ICS building was ever considered.
      filteredBuildings: [
        building("CEM Building"),
        building("Department of Human Kinetics"),
        building("Hydraulics Laboratory"),
        building("Institute of Statistics"),
        building("Institute of Computer Science (ICS)"),
      ],
      colleges: [{ collegeName: "College of Economics and Management" }],
    });

    expect(suggestions[0]?.value).toBe("Institute of Computer Science (ICS)");
  });

  it("still caps per category and overall", () => {
    const many = Array.from({ length: 10 }, (_, i) =>
      building(`Physics Building ${i}`),
    );
    const suggestions = buildEntitySuggestions("physics", {
      ...emptyData,
      filteredBuildings: many,
    });
    expect(suggestions.length).toBe(4);
  });
});

describe("rankSuggestions", () => {
  it("puts an exact alias (PS) above word-prefix and mid-word hits", () => {
    const buildings = [
      building("Physical Sciences Building"),
      building("ICropS Building"),
      building("FPPS Annex"),
    ];
    const ranked = rankSuggestions([
      ...scoreEntities("PS", {
        ...emptyData,
        filteredBuildings: buildings,
        organizations: [org("CHI EPSILON SORORITY (UP CE)")],
      }),
      ...scoreAliases(
        "PS",
        [{ alias: "PS", value: "Physical Sciences Building" }],
        buildings,
      ),
      ...scoreRooms("PS", [{ value: "PS 105" }, { value: "ICROPS 100" }]),
    ]);
    expect(ranked[0]?.value).toBe("Physical Sciences Building");
    expect(ranked[0]?.secondary).toBe("PS");
    expect(ranked[1]?.value).toBe("PS 105");
    // Mid-word hits come last.
    expect(ranked.at(-1)?.score).toBe(MATCH.midWord);
    expect(ranked.map((s) => s.value)).toContain(
      "CHI EPSILON SORORITY (UP CE)",
    );
  });

  it("dedupes an alias against the same building, keeping the best score", () => {
    const buildings = [building("Physical Sciences Building")];
    const ranked = rankSuggestions([
      ...scoreEntities("phys", { ...emptyData, filteredBuildings: buildings }),
      ...scoreAliases(
        "phys",
        [{ alias: "PhySci", value: "Physical Sciences Building" }],
        buildings,
      ),
    ]);
    expect(ranked).toHaveLength(1);
    expect(ranked[0]?.score).toBe(MATCH.prefix);
  });

  it("returns a room code query's room first", () => {
    const ranked = rankSuggestions([
      ...scoreEntities("PS 105", {
        ...emptyData,
        filteredBuildings: [building("Physical Sciences Building")],
      }),
      ...scoreRooms("PS 105", [
        { value: "PS 105A" },
        { value: "PS 105", fullName: "Lecture Hall" },
      ]),
    ]);
    expect(ranked[0]).toMatchObject({ value: "PS 105", category: "room" });
    expect(enterAction(ranked)).toMatchObject({
      kind: "select",
      suggestion: { value: "PS 105" },
    });
  });

  it("returns a course's sections first for cmsc12 / CMSC 12", () => {
    const rows = [
      section("CMSC 12", "T-1L", "PC 25"),
      section("CMSC 12", "U-2L", null),
      section("CMSC 123", "A", "ICS 314"),
    ];
    for (const query of ["cmsc12", "CMSC 12"]) {
      const ranked = rankSuggestions([
        ...scoreEntities(query, {
          ...emptyData,
          organizations: [org("Computer Science Society (CMSC)")],
        }),
        ...scoreClasses(query, rows),
      ]);
      expect(ranked[0]).toMatchObject({
        category: "class",
        value: "CMSC 12 T-1L",
        roomCode: "PC 25",
      });
      expect(ranked[1]?.value).toBe("CMSC 12 U-2L");
      expect(ranked[1]?.secondary).toContain("No room listed");
      // CMSC 123 is dropped once exact sections exist.
      expect(ranked.some((s) => s.value.startsWith("CMSC 123"))).toBe(false);
      expect(enterAction(ranked)).toEqual({
        kind: "course",
        courseCode: "CMSC 12",
      });
    }
  });

  it("keeps prefix sections when no section is the exact course", () => {
    const classes = scoreClasses("CMSC 1", [section("CMSC 12", "A", null)]);
    expect(classes).toHaveLength(1);
    expect(classes[0]?.score).toBe(MATCH.prefix);
  });
});

describe("groupSuggestions", () => {
  it("leaves a single-type list unlabeled", () => {
    const groups = groupSuggestions([
      { value: "A", category: "building", score: 0 },
      { value: "B", category: "dorm", score: 1 },
    ]);
    expect(groups).toEqual([
      {
        label: null,
        items: [
          { value: "A", category: "building", score: 0 },
          { value: "B", category: "dorm", score: 1 },
        ],
      },
    ]);
  });

  it("groups mixed types, ordered by each group's best hit", () => {
    const groups = groupSuggestions([
      { value: "PS 105", category: "room", score: 0 },
      { value: "Physical Sciences Building", category: "building", score: 1 },
      { value: "PS 106", category: "room", score: 1 },
    ]);
    expect(groups.map((g) => g.label)).toEqual(["Rooms", "Places"]);
    expect(groups[0]?.items.map((s) => s.value)).toEqual(["PS 105", "PS 106"]);
  });

  it("keeps mid-word hits last under More results", () => {
    const groups = groupSuggestions([
      { value: "College of Arts and Sciences", category: "college", score: 0 },
      { value: "CAS Annex 1", category: "building", score: 1 },
      { value: "Broadcasting Dept", category: "division", score: 3 },
    ]);
    expect(groups.map((g) => g.label)).toEqual([
      "Offices and orgs",
      "Places",
      "More results",
    ]);
    expect(groups[0]?.items.map((s) => s.value)).toEqual([
      "College of Arts and Sciences",
    ]);
    expect(groups[2]?.items.map((s) => s.value)).toEqual(["Broadcasting Dept"]);
  });

  it("returns nothing for an empty list", () => {
    expect(groupSuggestions([])).toEqual([]);
  });
});

describe("enterAction", () => {
  it("does nothing without results", () => {
    expect(enterAction([])).toEqual({ kind: "none" });
  });

  it("opens the only result", () => {
    const only = {
      value: "Baker Hall",
      category: "building",
      score: 3,
    } as const;
    expect(enterAction([only])).toEqual({ kind: "select", suggestion: only });
  });

  it("opens a clear winner", () => {
    const top = { value: "ICS", category: "organization", score: 0 } as const;
    expect(
      enterAction([top, { value: "ICS 314", category: "room", score: 1 }]),
    ).toEqual({ kind: "select", suggestion: top });
  });

  it("lists everything when ambiguous", () => {
    expect(
      enterAction([
        { value: "CAS Annex 1", category: "building", score: 1 },
        { value: "CAS Annex 2", category: "building", score: 1 },
      ]),
    ).toEqual({ kind: "expand" });
    expect(
      enterAction([
        { value: "Economics", category: "college", score: 3 },
        { value: "Kinetics", category: "building", score: 3 },
      ]),
    ).toEqual({ kind: "expand" });
  });
});
