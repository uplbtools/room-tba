import { describe, expect, test } from "bun:test";
import manifest from "@constants/building-footprints.json";
import { bundledFootprint } from "./building-footprints";
import { isFootprint } from "./overpass";

const fp = {
  outline: [
    [121.24, 14.16],
    [121.241, 14.16],
    [121.241, 14.161],
    [121.24, 14.16],
  ],
  levels: 2,
  heightMeters: null,
  osmName: "Hall",
  containsPoint: true,
};

describe("bundledFootprint", () => {
  test("returns the stored footprint by building name", () => {
    expect(bundledFootprint("Hall", { Hall: fp })).toEqual(fp as never);
  });

  test("null entry means OSM has nothing, so the viewer skips Overpass", () => {
    expect(bundledFootprint("Shed", { Shed: null })).toBeNull();
  });

  test("unknown or malformed entries fall back to Overpass (undefined)", () => {
    expect(bundledFootprint("Nope", { Hall: fp })).toBeUndefined();
    expect(bundledFootprint("Bad", { Bad: { outline: [] } })).toBeUndefined();
    expect(bundledFootprint("toString", {})).toBeUndefined();
  });

  test("every committed entry is null or a valid footprint", () => {
    const entries = Object.entries(manifest as Record<string, unknown>);
    expect(entries.length).toBeGreaterThan(0);
    for (const [, entry] of entries) {
      expect(entry === null || isFootprint(entry)).toBe(true);
    }
  });
});
