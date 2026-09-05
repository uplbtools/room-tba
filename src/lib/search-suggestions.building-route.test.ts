import { describe, expect, test } from "bun:test";
import type { BuildingData } from "./types";
import { buildBuildingSuggestions } from "./search-suggestions";

const building = (id: number, buildingName: string) =>
  ({ id, buildingName, lat: 14.16, lon: 121.24 }) as BuildingData;

const buildings = [
  building(1, "Institute of Computer Science (ICS)"),
  building(2, "College of Economics and Management"),
  building(3, "Institute of Human Kinetics"),
  building(4, "New Math Building"),
];

describe("buildBuildingSuggestions", () => {
  test("uses global search relevance so acronym matches beat mid-word hits", () => {
    expect(buildBuildingSuggestions("ics", buildings).map((b) => b.id)).toEqual([
      1,
      2,
      3,
    ]);
  });

  test("returns buildings only and honors a caller limit", () => {
    expect(buildBuildingSuggestions("i", buildings, 2)).toHaveLength(2);
  });

  test("blank searches return no suggestions", () => {
    expect(buildBuildingSuggestions("   ", buildings)).toEqual([]);
  });
});
