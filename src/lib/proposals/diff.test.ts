import { describe, expect, test } from "bun:test";
import { buildFieldDiffs } from "./diff";

describe("buildFieldDiffs", () => {
  test("shows before and after for a changed string field", () => {
    const diffs = buildFieldDiffs(
      { buildingName: "Old Hall", version: 3 },
      { buildingName: "New Hall" },
    );
    expect(diffs).toEqual([
      {
        field: "buildingName",
        label: "Building name",
        before: "Old Hall",
        after: "New Hall",
      },
    ]);
  });

  test("omits fields where the value is unchanged", () => {
    const diffs = buildFieldDiffs(
      { directions: "Same", capacity: 10 },
      { directions: "Same", capacity: 12 },
    );
    expect(diffs.map((d) => d.field)).toEqual(["capacity"]);
  });

  test("formats booleans, nulls, and arrays", () => {
    const diffs = buildFieldDiffs(
      { isUpManaged: false, contactEmail: null, amenities: ["wifi"] },
      { isUpManaged: true, contactEmail: "a@b.ph", amenities: ["wifi", "gym"] },
    );
    expect(diffs).toEqual([
      { field: "isUpManaged", label: "UP managed", before: "No", after: "Yes" },
      {
        field: "contactEmail",
        label: "Contact email",
        before: null,
        after: "a@b.ph",
      },
      {
        field: "amenities",
        label: "amenities",
        before: "wifi",
        after: "wifi, gym",
      },
    ]);
  });

  test("create proposals (null current) list every patch field with null before", () => {
    const diffs = buildFieldDiffs(null, { roomCode: "CEM 203", lat: 14.16 });
    expect(diffs).toEqual([
      { field: "roomCode", label: "Room code", before: null, after: "CEM 203" },
      { field: "lat", label: "Latitude", before: null, after: "14.16" },
    ]);
  });

  test("skips bundled rooms (own summary) but renders event locations", () => {
    const diffs = buildFieldDiffs(null, {
      rooms: [{ roomCode: "A" }],
      locations: [{ label: "gate" }],
      title: "Fair",
    });
    expect(diffs.map((d) => d.field)).toEqual(["locations", "title"]);
  });

  test("summarizes event locations as label (lat, lon) lists", () => {
    const diffs = buildFieldDiffs(
      { locations: [{ label: "Old gate", lat: 14.16, lon: 121.24 }] },
      {
        locations: [
          { label: "Main gate", lat: 14.16723, lon: 121.24341 },
          { label: "", lat: null, lon: null },
        ],
      },
    );
    expect(diffs).toEqual([
      {
        field: "locations",
        label: "Locations",
        before: "Old gate (14.16000, 121.24000)",
        after: "Main gate (14.16723, 121.24341); Unnamed",
      },
    ]);
  });

  test("treats empty strings as unset", () => {
    const diffs = buildFieldDiffs(
      { description: "" },
      { description: "Now filled" },
    );
    expect(diffs[0]).toEqual({
      field: "description",
      label: "Description",
      before: null,
      after: "Now filled",
    });
  });
});

describe("buildFieldDiffs foreign key resolution (#873)", () => {
  const resolveName = (field: string, id: number) => {
    if (field === "buildingId") {
      return (
        (
          { 3: "Physical Sciences", 24: "CHE Building" } as Record<
            number,
            string
          >
        )[id] ?? null
      );
    }
    if (field === "collegeId") {
      return ({ 5: "CAS" } as Record<number, string>)[id] ?? null;
    }
    return null;
  };

  test("renders entity names and keeps the ids as secondary values", () => {
    const diffs = buildFieldDiffs(
      { buildingId: 3 },
      { buildingId: 24 },
      resolveName,
    );
    expect(diffs).toEqual([
      {
        field: "buildingId",
        label: "Building",
        before: "Physical Sciences",
        after: "CHE Building",
        beforeId: 3,
        afterId: 24,
      },
    ]);
  });

  test("falls back to the raw id when the resolver has no name", () => {
    const diffs = buildFieldDiffs(
      { buildingId: 3 },
      { buildingId: 99 },
      resolveName,
    );
    expect(diffs[0]?.after).toBe("99");
    expect(diffs[0]?.afterId).toBeUndefined();
  });

  test("labels divisionId instead of leaking the field name", () => {
    const diffs = buildFieldDiffs({ divisionId: 1 }, { divisionId: 2 });
    expect(diffs[0]?.label).toBe("Division");
  });

  test("resolves a create proposal's foreign key with a null before", () => {
    const diffs = buildFieldDiffs(null, { buildingId: 24 }, resolveName);
    expect(diffs[0]).toEqual({
      field: "buildingId",
      label: "Building",
      before: null,
      after: "CHE Building",
      afterId: 24,
    });
  });

  test("still detects a change when two ids share a display name", () => {
    const sameName = () => "Twin Hall";
    const diffs = buildFieldDiffs(
      { buildingId: 3 },
      { buildingId: 24 },
      sameName,
    );
    expect(diffs).toHaveLength(1);
    expect(diffs[0]?.beforeId).toBe(3);
    expect(diffs[0]?.afterId).toBe(24);
  });

  test("leaves non-id fields untouched", () => {
    const diffs = buildFieldDiffs(
      { capacity: 10 },
      { capacity: 12 },
      resolveName,
    );
    expect(diffs[0]).toEqual({
      field: "capacity",
      label: "Capacity",
      before: "10",
      after: "12",
    });
  });
});
