import { describe, expect, test } from "bun:test";
import {
  type AuditEntity,
  buildNameIndex,
  centroid,
  clusterByProximity,
  nearestOf,
  parseDirectionsReferences,
  parseLocatedAt,
  resolveReference,
  spreadMeters,
  tokenize,
} from "@lib/campus-audit";
import { distanceMeters } from "@lib/campus-route";

/**
 * Real prod rows (ids and coordinates as stored), so the fixtures keep the
 * heuristics honest against the data that produced the bugs. `distanceMeters`
 * itself is covered in campus-route.test.ts; the assertions here pin the
 * distances the audit's thresholds are calibrated against.
 */
const gradSchool: AuditEntity = {
  kind: "building",
  id: 20,
  name: "Graduate School Building",
  lat: 14.1635155,
  lon: 121.2394355,
};
const internationalHouse: AuditEntity = {
  kind: "dorm",
  id: 5,
  name: "International House Residence Hall",
  lat: 14.1631275979342,
  lon: 121.241432659405,
  aliases: ["IH"],
};
const ovca: AuditEntity = {
  kind: "organization",
  id: 39,
  name: "Office of the Vice Chancellor for Administration (OVCA)",
  lat: 14.165517,
  lon: 121.239035,
};
const irnr: AuditEntity = {
  kind: "organization",
  id: 20,
  name: "Institute of Renewable Natural Resources (IRNR)",
  lat: 14.1544,
  lon: 121.236022,
};
const casAnnex1: AuditEntity = {
  kind: "building",
  id: 7,
  name: "CAS Annex 1",
  lat: 14.1656175129359,
  lon: 121.24111345933,
};
const casAnnex2: AuditEntity = {
  kind: "building",
  id: 8,
  name: "CAS Annex 2",
  lat: 14.1656699585313,
  lon: 121.241791407374,
};
const gonzalezHall: AuditEntity = {
  kind: "place",
  id: 25,
  name: "Bienvenido M. Gonzalez Hall",
  lat: 14.165517,
  lon: 121.239035,
};

const index = buildNameIndex([
  gradSchool,
  internationalHouse,
  ovca,
  irnr,
  casAnnex1,
  casAnnex2,
  gonzalezHall,
]);

describe("parseDirectionsReferences", () => {
  test("reads the Graduate School directions that #886 turned on", () => {
    expect(
      parseDirectionsReferences(
        "Behind the International House dormitory, at the foot of the ascent going to UHS and Forestry.",
      ),
    ).toEqual([
      { relation: "behind", phrase: "International House dormitory" },
      {
        relation: "at the foot of",
        phrase: "ascent going to UHS and Forestry",
      },
    ]);
  });

  test("prefers the longest relation, so 'in front of' is not read as 'front of'", () => {
    const [ref] = parseDirectionsReferences("In front of CAS Annex 1.");
    expect(ref).toEqual({ relation: "in front of", phrase: "CAS Annex 1" });
  });

  test("stops the phrase at punctuation rather than running into the next clause", () => {
    const refs = parseDirectionsReferences(
      "The tall building to the LEFT of Oble, beside OUR. Has galleries.",
    );
    expect(refs.map((r) => r.phrase)).toEqual(["Oble", "OUR"]);
  });

  test("ignores vague proximity, which is true at 300 m and only adds noise", () => {
    expect(parseDirectionsReferences("Near the CEM Parking lot")).toEqual([]);
    expect(parseDirectionsReferences("Along Pili Drive, past ICRops.")).toEqual(
      [],
    );
  });

  test("handles missing directions", () => {
    expect(parseDirectionsReferences(null)).toEqual([]);
    expect(parseDirectionsReferences("")).toEqual([]);
  });
});

describe("parseLocatedAt", () => {
  test("cuts at the comma, where the host ends and region filler begins", () => {
    expect(
      parseLocatedAt(
        "CAFS institute for crop science. Located at: Nemesio B. Mendiola Hall, southern main campus.",
      ),
    ).toBe("Nemesio B. Mendiola Hall");
  });

  test("keeps a floor-prefixed host", () => {
    expect(
      parseLocatedAt(
        "Located at: 3/F Bienvenido M. Gonzalez Hall, main campus.",
      ),
    ).toBe("3/F Bienvenido M. Gonzalez Hall");
  });

  test("reads 'Temporarily located at' the same way", () => {
    expect(
      parseLocatedAt("Temporarily located at: Graduate School (GS) Dormitory"),
    ).toBe("Graduate School (GS) Dormitory");
  });

  test("rejects proximity claims, which are not tenancy", () => {
    expect(parseLocatedAt("Located at: Near CAFS complex")).toBeNull();
    expect(
      parseLocatedAt("Located at: Between Freedom Park and the Math Building."),
    ).toBeNull();
  });

  test("rejects region references that name no host", () => {
    expect(parseLocatedAt("Located at: Forestry (upper) campus")).toBeNull();
    expect(
      parseLocatedAt(
        "A hall located in the lower campus area (Batong Malake).",
      ),
    ).toBeNull();
  });

  test("handles descriptions with no location claim", () => {
    expect(
      parseLocatedAt("Student council of the College of Arts."),
    ).toBeNull();
    expect(parseLocatedAt(null)).toBeNull();
  });
});

describe("tokenize", () => {
  test("keeps digits, which are all that separate CAS Annex 1 from Annex 2", () => {
    expect(tokenize("CAS Annex 1")).toEqual(["cas", "annex", "1"]);
  });

  test("drops stopwords and punctuation", () => {
    expect(tokenize("Institute of Crop Science (ICropS)")).toEqual([
      "institute",
      "crop",
      "science",
      "icrops",
    ]);
  });
});

describe("resolveReference", () => {
  test("resolves the dormitory the Graduate School directions name", () => {
    const matches = resolveReference("International House dormitory", index);
    expect(matches.map((m) => m.entity.id)).toEqual([internationalHouse.id]);
  });

  test("does not match an office on one shared common word", () => {
    // "in front of the Administration Building" must not resolve to the Office
    // of the Vice Chancellor for *Administration*: that reported a bogus 419 m
    // contradiction when the real problem is a missing building row.
    expect(resolveReference("Administration Building", index)).toEqual([]);
  });

  test("matches an acronym only when it is written in caps", () => {
    expect(
      resolveReference("beside IRNR", index).map((m) => m.entity.id),
    ).toEqual([irnr.id]);
    expect(resolveReference("beside irnr", index)).toEqual([]);
  });

  test("returns every tie rather than silently picking one", () => {
    const matches = resolveReference("beside the CAS Annex buildings", index);
    expect(matches.map((m) => m.entity.id).sort()).toEqual([
      casAnnex1.id,
      casAnnex2.id,
    ]);
  });

  test("distinguishes the annexes once the number is given", () => {
    const matches = resolveReference("In front of CAS Annex 1", index);
    expect(matches.map((m) => m.entity.id)).toEqual([casAnnex1.id]);
  });

  test("excludes the entity doing the referring", () => {
    // A building is never 'beside' itself, so its own row must not be the
    // thing its directions resolve to. Annex 2 legitimately remains.
    const matches = resolveReference("beside CAS Annex 1", index, {
      kind: "building",
      id: casAnnex1.id,
    });
    expect(matches.map((m) => m.entity.id)).not.toContain(casAnnex1.id);
    expect(matches.map((m) => m.entity.id)).toEqual([casAnnex2.id]);
  });

  test("structural words alone never identify a building", () => {
    // "building"/"hall"/"office" say what a thing is, not which one, so a
    // small fork corpus must not match on them either.
    expect(resolveReference("the Building", index)).toEqual([]);
    expect(resolveReference("the Office", index)).toEqual([]);
  });

  test("finds nothing for a landmark that is not in the data", () => {
    expect(resolveReference("the Diocesan Shrine of St", index)).toEqual([]);
  });
});

describe("geometry", () => {
  test("the Graduate School pin is 220 m from the dormitory it claims to be behind", () => {
    // The finding detection 1 reports on prod today, and the reason
    // `adjacencyMax` is 150 m: this must land the wrong side of it.
    const away = distanceMeters(gradSchool, internationalHouse);
    expect(Math.round(away)).toBe(220);
    expect(away).toBeGreaterThan(150);
  });

  test("adjacent buildings stay well inside the threshold", () => {
    expect(distanceMeters(casAnnex1, casAnnex2)).toBeLessThan(150);
  });

  test("nearestOf picks the closest candidate", () => {
    const nearest = nearestOf(gradSchool, [casAnnex1, internationalHouse]);
    expect(nearest?.entity.id).toBe(internationalHouse.id);
    expect(nearest?.meters).toBeCloseTo(
      distanceMeters(gradSchool, internationalHouse),
      6,
    );
  });

  test("nearestOf has nothing to return for an empty candidate list", () => {
    expect(nearestOf(gradSchool, [])).toBeNull();
  });

  test("centroid averages the cluster", () => {
    expect(
      centroid([
        { lat: 0, lon: 0 },
        { lat: 2, lon: 4 },
      ]),
    ).toEqual({
      lat: 1,
      lon: 2,
    });
  });

  test("spreadMeters is the widest gap in the group", () => {
    const spread = spreadMeters([gradSchool, casAnnex1, casAnnex2]);
    expect(spread).toBeCloseTo(distanceMeters(gradSchool, casAnnex2), 6);
  });

  test("clusterByProximity groups only what is actually close", () => {
    const clusters = clusterByProximity(
      [gonzalezHall, ovca, casAnnex1, gradSchool],
      3,
    );
    expect(clusters).toHaveLength(1);
    expect(clusters[0].map((e) => e.id).sort()).toEqual(
      [gonzalezHall.id, ovca.id].sort(),
    );
  });

  test("clusterByProximity returns nothing when every pin is distinct", () => {
    expect(clusterByProximity([casAnnex1, casAnnex2, gradSchool], 3)).toEqual(
      [],
    );
  });
});
