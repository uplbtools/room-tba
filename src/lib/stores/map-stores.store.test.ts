import { beforeEach, describe, expect, test } from "vitest";
import {
  Building3DStore,
  MapToolsStore,
  MapViewStore,
  TerrainStore,
} from "./map-stores.svelte";
import { mapEditStore, mapToolsStore, terrainStore } from "@lib/store.svelte";

describe("MapToolsStore", () => {
  let store: MapToolsStore;

  beforeEach(() => {
    store = new MapToolsStore();
  });

  test("toggle opens and closes flyout", () => {
    expect(store.open).toBe(false);
    store.toggle();
    expect(store.open).toBe(true);
    store.toggle();
    expect(store.open).toBe(false);
  });

  test("openSection sets active section and expands it", () => {
    store.openSection("terrain");
    expect(store.open).toBe(true);
    expect(store.activeSection).toBe("terrain");
    expect(store.expandedSections.has("terrain")).toBe(true);
  });
});

describe("TerrainStore", () => {
  let store: TerrainStore;

  beforeEach(() => {
    store = new TerrainStore();
    mapEditStore.close();
    mapToolsStore.close();
  });

  test("enable sets loading and disables map edit", () => {
    mapEditStore.enable();
    store.enable();
    expect(store.enabled).toBe(true);
    expect(store.status).toBe("loading");
    expect(mapEditStore.enabled).toBe(false);
  });

  test("markUnavailable disables terrain and stores message", () => {
    store.enable();
    store.markUnavailable("Offline");
    expect(store.enabled).toBe(false);
    expect(store.status).toBe("unavailable");
    expect(store.message).toBe("Offline");
  });
});

describe("MapViewStore", () => {
  test("toggleEventsOnly flips eventsOnly", () => {
    const store = new MapViewStore();
    store.toggleEventsOnly();
    expect(store.eventsOnly).toBe(true);
    store.showAll();
    expect(store.eventsOnly).toBe(false);
  });

  test("org and place layers default on and toggle independently", () => {
    const store = new MapViewStore();
    expect(store.showOrgs).toBe(true);
    expect(store.showPlaces).toBe(true);
    store.toggleOrgs();
    expect(store.showOrgs).toBe(false);
    expect(store.showPlaces).toBe(true);
    store.togglePlaces();
    expect(store.showPlaces).toBe(false);
  });

  test("showAll restores hidden pin layers", () => {
    const store = new MapViewStore();
    store.toggleOrgs();
    store.togglePlaces();
    store.showAll();
    expect(store.showOrgs).toBe(true);
    expect(store.showPlaces).toBe(true);
  });
});

describe("Building3DStore", () => {
  test("open and close building viewer", () => {
    const store = new Building3DStore();
    store.open("Test Hall");
    expect(store.buildingName).toBe("Test Hall");
    store.close();
    expect(store.buildingName).toBeNull();
  });
});

describe("terrain singleton exclusivity", () => {
  beforeEach(() => {
    terrainStore.disable();
    mapEditStore.close();
  });

  test("terrain enable closes map edit on shared singletons", () => {
    mapEditStore.enable();
    terrainStore.enable();
    expect(mapEditStore.enabled).toBe(false);
    expect(terrainStore.enabled).toBe(true);
  });
});
