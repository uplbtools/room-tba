import { describe, expect, it } from "bun:test";
import {
  findDeptEntity,
  type HistoryRow,
  type OrgEntityRow,
  rankBuildingsByHistory,
  resolveProbableLocation,
} from "./probable-location";

const icsOrg: OrgEntityRow = {
  name: "Institute of Computer Science (ICS)",
  lat: 14.1648,
  lon: 121.2413,
  buildingId: null,
};

const unlocatableOrg: OrgEntityRow = {
  name: "Institute of Chemistry (IC)",
  lat: null,
  lon: null,
  buildingId: null,
};

function history(
  rows: Array<[buildingId: number, termId: number, sections: number]>,
): HistoryRow[] {
  return rows.map(([buildingId, termId, sections]) => ({
    buildingId,
    buildingName: `Building ${buildingId}`,
    termId,
    sections,
  }));
}

describe("rankBuildingsByHistory (#846)", () => {
  it("returns null on empty history", () => {
    expect(rankBuildingsByHistory([])).toBeNull();
  });

  it("picks the modal building", () => {
    const top = rankBuildingsByHistory(
      history([
        [1, 1251, 5],
        [2, 1251, 2],
      ]),
    );
    expect(top?.buildingId).toBe(1);
    expect(top?.buildingName).toBe("Building 1");
  });

  it("weights newer terms higher (linear by term rank)", () => {
    // Building 1: 3 sections in the oldest term (weight 1) = 3.
    // Building 2: 2 sections in the newest term (weight 2) = 4.
    const top = rankBuildingsByHistory(
      history([
        [1, 1231, 3],
        [2, 1252, 2],
      ]),
    );
    expect(top?.buildingId).toBe(2);
  });

  it("breaks exact score ties by the more recent building", () => {
    // Both score 2×1: building 2 was seen in the newer term.
    const top = rankBuildingsByHistory(
      history([
        [1, 1231, 2],
        [2, 1252, 1],
      ]),
    );
    expect(top?.buildingId).toBe(2);
  });
});

describe("findDeptEntity", () => {
  it("matches ignoring the (ACRONYM) suffix", () => {
    expect(
      findDeptEntity([icsOrg], "Institute of Computer Science")?.name,
    ).toBe("Institute of Computer Science (ICS)");
  });

  it("returns null when nothing matches", () => {
    expect(findDeptEntity([icsOrg], "Department of Humanities")).toBeNull();
  });
});

describe("resolveProbableLocation fallback order (#846)", () => {
  const courseHistory = history([[10, 1252, 4]]);
  const deptHistory = history([[20, 1252, 9]]);

  it("1) department entity with a position wins, ignoring history", () => {
    const location = resolveProbableLocation({
      acadOrg: "LBICS",
      acadGroup: "CAS",
      orgs: [icsOrg],
      courseHistory,
      deptHistory,
    });
    expect(location).toEqual({
      source: "department",
      deptName: "Institute of Computer Science",
      collegeCode: "CAS",
      orgName: "Institute of Computer Science (ICS)",
    });
  });

  it("2) course history when the department entity is missing or unpinned", () => {
    const location = resolveProbableLocation({
      acadOrg: "LBIC", // curated, but its entity has no position
      acadGroup: "CAS",
      orgs: [unlocatableOrg],
      courseHistory,
      deptHistory,
    });
    expect(location?.source).toBe("course-history");
    expect(location?.buildingId).toBe(10);
    expect(location?.deptName).toBe("Institute of Chemistry");
  });

  it("3) department history when course history is empty", () => {
    const location = resolveProbableLocation({
      acadOrg: "LBNOPE",
      acadGroup: "CEAT",
      orgs: [],
      courseHistory: [],
      deptHistory,
    });
    expect(location?.source).toBe("dept-history");
    expect(location?.buildingId).toBe(20);
    // Uncurated org: college code falls back to the row's acad_group.
    expect(location?.collegeCode).toBe("CEAT");
    expect(location?.deptName).toBeUndefined();
  });

  it("4) decoded name alone when there is no pin and no history", () => {
    const location = resolveProbableLocation({
      acadOrg: "LBDHUM",
      acadGroup: "CAS",
      orgs: [],
      courseHistory: [],
      deptHistory: [],
    });
    expect(location).toEqual({
      source: "department",
      deptName: "Department of Humanities",
      collegeCode: "CAS",
    });
  });

  it("5) null when nothing is known", () => {
    expect(
      resolveProbableLocation({
        acadOrg: null,
        acadGroup: null,
        orgs: [icsOrg],
        courseHistory: [],
        deptHistory: [],
      }),
    ).toBeNull();
  });
});
