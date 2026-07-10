import { beforeEach, describe, expect, test } from "vitest";
import { buildingTypeFilter, queryStore } from "@lib/store.svelte";

describe("QueryStore pin filter reset (#chip mislabel)", () => {
  beforeEach(() => {
    queryStore.clearQuery();
    buildingTypeFilter.set("all");
  });

  test("committing a result outside the filter domain clears the filter", () => {
    buildingTypeFilter.set("non-up-managed-dorm");
    queryStore.updateQuery({
      type: "result",
      category: "organization",
      value: "CAFS Dean's Office",
    });
    expect(buildingTypeFilter.value).toBe("all");
  });

  test("committing a dorm result keeps a dorm filter", () => {
    buildingTypeFilter.set("up-managed-dorm");
    queryStore.updateQuery({
      type: "result",
      category: "dorm",
      value: "Makiling Residence Hall",
    });
    expect(buildingTypeFilter.value).toBe("up-managed-dorm");
  });

  test("committing a building result keeps a building filter", () => {
    buildingTypeFilter.set("class-building");
    queryStore.updateQuery({
      type: "result",
      category: "building",
      value: "Physical Sciences Building",
    });
    expect(buildingTypeFilter.value).toBe("class-building");
  });

  test("plain query typing does not clear the filter", () => {
    buildingTypeFilter.set("non-up-managed-dorm");
    queryStore.updateQuery({ type: "query", category: null, value: "caf" });
    expect(buildingTypeFilter.value).toBe("non-up-managed-dorm");
  });
});
