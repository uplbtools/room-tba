import { describe, expect, test } from "bun:test";
import type maplibregl from "maplibre-gl";
import {
  BASEMAP_DARK_GENERIC,
  BASEMAP_DARK_LAYER_PAINT,
  BASEMAP_LAYER_PAINT,
  uplbNight,
} from "@constants/map-basemap-palette";
import { applyBasemapPalette, genericDarkPaint } from "./map-basemap-palette";

type Layer = { id: string; type: string; source?: string };

function fakeMap(
  layers: Layer[],
  paint: Record<string, Record<string, unknown>>,
) {
  const state = structuredClone(paint);
  const map = {
    getLayer: (id: string) => layers.find((l) => l.id === id),
    getStyle: () => ({
      sources: {
        openmaptiles: { type: "vector" },
        campus: { type: "geojson" },
      },
      layers,
    }),
    getPaintProperty: (id: string, prop: string) => state[id]?.[prop],
    setPaintProperty: (id: string, prop: string, value: unknown) => {
      state[id] ??= {};
      state[id][prop] = value;
    },
    setLayoutProperty: () => {},
  };
  return { map: map as unknown as maplibregl.Map, state };
}

const LAYERS: Layer[] = [
  { id: "background", type: "background" },
  { id: "road_label", type: "symbol", source: "openmaptiles" },
  { id: "bridge_street", type: "line", source: "openmaptiles" },
  { id: "campus-labels", type: "symbol", source: "campus" },
];
const STYLE_PAINT = {
  background: { "background-color": "#eee" },
  road_label: { "text-color": "#333", "text-halo-color": "#fff" },
  bridge_street: { "line-color": "#fea" },
  "campus-labels": { "text-color": "#7b1113" },
};

describe("applyBasemapPalette", () => {
  test("light applies the light table only", () => {
    const { map, state } = fakeMap(LAYERS, STYLE_PAINT);
    applyBasemapPalette(map, "light");
    expect(state["background"]?.["background-color"]).toBe(
      BASEMAP_LAYER_PAINT["background"]?.["background-color"],
    );
    expect(state["road_label"]?.["text-color"]).toBe("#333");
  });

  test("dark recolors the basemap but never app overlays", () => {
    const { map, state } = fakeMap(LAYERS, STYLE_PAINT);
    applyBasemapPalette(map, "dark");
    expect(state["background"]?.["background-color"]).toBe(
      uplbNight["background"],
    );
    expect(state["road_label"]?.["text-color"]).toBe(
      BASEMAP_DARK_GENERIC.symbolText,
    );
    expect(state["bridge_street"]?.["line-color"]).toBe(
      BASEMAP_DARK_GENERIC.road,
    );
    expect(state["campus-labels"]?.["text-color"]).toBe("#7b1113");
  });

  test("switching back to light restores every touched property", () => {
    const { map, state } = fakeMap(LAYERS, STYLE_PAINT);
    applyBasemapPalette(map, "light");
    const light = structuredClone(state);
    applyBasemapPalette(map, "dark");
    applyBasemapPalette(map, "dark");
    applyBasemapPalette(map, "light");
    expect(state).toEqual(light);
  });
});

describe("dark basemap tables", () => {
  test("dark table covers every layer the light table overrides", () => {
    expect(Object.keys(BASEMAP_DARK_LAYER_PAINT).sort()).toEqual(
      Object.keys(BASEMAP_LAYER_PAINT).sort(),
    );
  });

  test("generic dark paint picks by layer type and id", () => {
    expect(genericDarkPaint({ id: "road_minor_casing", type: "line" })).toEqual(
      {
        "line-color": BASEMAP_DARK_GENERIC.casing,
      },
    );
    expect(genericDarkPaint({ id: "boundary_3", type: "line" })).toBeNull();
    expect(genericDarkPaint({ id: "road_shield", type: "symbol" })).toBeNull();
    expect(
      genericDarkPaint({ id: "landuse_residential", type: "fill" }),
    ).toEqual({
      "fill-color": BASEMAP_DARK_GENERIC.fill,
    });
  });
});
