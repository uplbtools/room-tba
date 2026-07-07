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

  test("skips bundled rooms and event locations keys", () => {
    const diffs = buildFieldDiffs(null, {
      rooms: [{ roomCode: "A" }],
      locations: [{ label: "gate" }],
      title: "Fair",
    });
    expect(diffs.map((d) => d.field)).toEqual(["title"]);
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
