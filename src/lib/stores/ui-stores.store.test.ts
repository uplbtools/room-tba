import { beforeEach, describe, expect, test } from "vitest";
import {
  buildingTypeFilter,
  queryStore,
  sidebarStore,
} from "@lib/store.svelte";

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

describe("QueryStore browseOrigin (list breadcrumb)", () => {
  beforeEach(() => queryStore.clearQuery());

  test("a place picked from a list remembers that list", () => {
    queryStore.updateQuery({
      type: "result",
      category: "browse",
      value: "buildings",
    });
    queryStore.updateQuery({
      type: "result",
      category: "building",
      value: "Physical Sciences Building",
    });
    expect(queryStore.browseOrigin).toBe("buildings");
  });

  test("a place opened from search or a deep link has no list", () => {
    queryStore.updateQuery({
      type: "result",
      category: "building",
      value: "Physical Sciences Building",
    });
    expect(queryStore.browseOrigin).toBeNull();

    queryStore.hydrateQuery({
      type: "result",
      category: "dorm",
      value: "Makiling Residence Hall",
    });
    expect(queryStore.browseOrigin).toBeNull();
  });

  test("re-hydrating the same place keeps its list", () => {
    queryStore.updateQuery({
      type: "result",
      category: "browse",
      value: "dorms",
    });
    queryStore.updateQuery({
      type: "result",
      category: "dorm",
      value: "Makiling Residence Hall",
    });
    queryStore.hydrateQuery({
      type: "result",
      category: "dorm",
      value: "Makiling Residence Hall",
    });
    expect(queryStore.browseOrigin).toBe("dorms");
  });
});

describe("SidebarStore mobile rail", () => {
  beforeEach(() => {
    sidebarStore.closeRail();
    sidebarStore.changeOpened("map");
  });

  test("rail starts closed and toggleRail flips it", () => {
    expect(sidebarStore.railOpen).toBe(false);
    sidebarStore.toggleRail();
    expect(sidebarStore.railOpen).toBe(true);
    sidebarStore.toggleRail();
    expect(sidebarStore.railOpen).toBe(false);
  });

  test("closeRail forces the rail shut", () => {
    sidebarStore.toggleRail();
    sidebarStore.closeRail();
    expect(sidebarStore.railOpen).toBe(false);
  });

  test("changeOpened switches the panel and closes the rail", () => {
    sidebarStore.toggleRail();
    sidebarStore.changeOpened("planner");
    expect(sidebarStore.panelOpen).toBe("planner");
    expect(sidebarStore.railOpen).toBe(false);
  });

  test("changeOpened keeps the rail open for settings and contributors", () => {
    sidebarStore.toggleRail();
    sidebarStore.changeOpened("settings");
    expect(sidebarStore.panelOpen).toBe("settings");
    expect(sidebarStore.railOpen).toBe(true);

    sidebarStore.changeOpened("contributors");
    expect(sidebarStore.panelOpen).toBe("contributors");
    expect(sidebarStore.railOpen).toBe(true);
  });
});
