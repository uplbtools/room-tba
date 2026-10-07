import { describe, expect, it } from "bun:test";
import { keepCachedRows, type LoadedCampusData } from "./keep-cached-rows";

function data(overrides: Partial<LoadedCampusData> = {}): LoadedCampusData {
  return {
    buildings: [],
    colleges: [],
    divisions: [],
    dorms: [],
    events: [],
    organizations: [],
    places: [],
    totalRooms: 0,
    directionCount: 0,
    ...overrides,
  } as LoadedCampusData;
}

const onScreen = data({
  buildings: [{ id: 1 }] as never,
  dorms: [{ id: 7 }] as never,
  totalRooms: 40,
  directionCount: 12,
});

describe("keepCachedRows", () => {
  it("keeps on-screen rows when a cached table reads empty", () => {
    const next = data({ buildings: [{ id: 2 }] as never });
    const merged = keepCachedRows(onScreen, next, new Set(["dorms"]));
    expect(merged.dorms).toBe(onScreen.dorms);
    expect(merged.buildings).toBe(next.buildings);
  });

  it("trusts an empty table that came from the network", () => {
    const merged = keepCachedRows(onScreen, data(), new Set(["buildings"]));
    expect(merged.dorms).toEqual([]);
    expect(merged.buildings).toBe(onScreen.buildings);
  });

  it("treats every table as cached for a PGlite read", () => {
    const merged = keepCachedRows(onScreen, data(), "all");
    expect(merged.buildings).toBe(onScreen.buildings);
    expect(merged.dorms).toBe(onScreen.dorms);
  });

  it("keeps room counts when the fallback count is zero", () => {
    const merged = keepCachedRows(onScreen, data(), "all");
    expect(merged.totalRooms).toBe(40);
    expect(merged.directionCount).toBe(12);
  });

  it("returns next untouched with nothing on screen", () => {
    const next = data();
    expect(keepCachedRows(null, next, "all")).toBe(next);
  });
});
