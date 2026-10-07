import { describe, expect, it } from "bun:test";
import type { StyleSpecification } from "maplibre-gl";
import { groundStyle, zoomForMetersPerPixel } from "./osm-basemap";

describe("groundStyle", () => {
  const style = {
    version: 8,
    sources: {},
    terrain: { source: "dem" },
    sky: {},
    layers: [
      { id: "land", type: "background" },
      { id: "roads", type: "line", source: "omt" },
      { id: "road-names", type: "symbol", source: "omt" },
      { id: "poi-parking", type: "symbol", source: "omt" },
      { id: "building-3d", type: "fill-extrusion", source: "omt" },
    ],
  } as unknown as StyleSpecification;

  it("drops labels, POI icons and extrusions for the tilted ground", () => {
    expect(groundStyle(style).layers.map((l) => l.id)).toEqual([
      "land",
      "roads",
    ]);
  });

  it("drops terrain and sky so the ground renders flat", () => {
    const ground = groundStyle(style);
    expect("terrain" in ground).toBe(false);
    expect("sky" in ground).toBe(false);
  });
});

describe("zoomForMetersPerPixel", () => {
  it("matches Web Mercator scale at the equator", () => {
    // z0 = one 512px tile spans the whole equator.
    expect(zoomForMetersPerPixel(0, 40_075_016.686 / 512)).toBeCloseTo(0, 6);
    expect(
      zoomForMetersPerPixel(0, 40_075_016.686 / 512 / 2 ** 18),
    ).toBeCloseTo(18, 6);
  });
});
