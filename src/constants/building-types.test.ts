import { describe, expect, it } from "bun:test";
import {
  buildingMatchesTypeFilter,
  getBuildingTypeFilterOptions,
} from "@constants/building-types";
import type { BuildingData } from "@lib/types";

function building(id: number, type: "admin" | "non-admin"): BuildingData {
  // Only the fields the filter reads matter here.
  return { id, buildingType: type } as BuildingData;
}

describe("buildingMatchesTypeFilter", () => {
  const withClasses = new Set([1, 3]);

  it("matches admin buildings to the administrative filter", () => {
    expect(
      buildingMatchesTypeFilter(
        building(1, "admin"),
        "administrative-building",
      ),
    ).toBe(true);
    expect(
      buildingMatchesTypeFilter(
        building(2, "non-admin"),
        "administrative-building",
      ),
    ).toBe(false);
  });

  it("matches non-admin buildings to the class filter regardless of classes", () => {
    expect(
      buildingMatchesTypeFilter(building(2, "non-admin"), "class-building"),
    ).toBe(true);
  });

  it("surfaces an admin building that hosts classes under BOTH filters", () => {
    const dual = building(1, "admin"); // id 1 is in withClasses
    expect(
      buildingMatchesTypeFilter(dual, "administrative-building", withClasses),
    ).toBe(true);
    expect(buildingMatchesTypeFilter(dual, "class-building", withClasses)).toBe(
      true,
    );
  });

  it("keeps an admin building with no classes out of the class filter", () => {
    const adminOnly = building(9, "admin"); // not in withClasses
    expect(
      buildingMatchesTypeFilter(adminOnly, "class-building", withClasses),
    ).toBe(false);
  });

  it("matches everything under 'all'", () => {
    expect(buildingMatchesTypeFilter(building(9, "admin"), "all")).toBe(true);
  });
});

describe("getBuildingTypeFilterOptions", () => {
  it("counts a dual-role building in both admin and class buckets", () => {
    const buildings = [
      building(1, "admin"), // dual — hosts classes
      building(2, "admin"), // admin only
      building(3, "non-admin"), // class only
    ];
    const opts = getBuildingTypeFilterOptions(buildings, [], new Set([1]));
    const count = (v: string) => opts.find((o) => o.value === v)?.count ?? 0;
    expect(count("administrative-building")).toBe(2); // buildings 1 + 2
    expect(count("class-building")).toBe(2); // buildings 1 (classes) + 3 (non-admin)
  });
});
