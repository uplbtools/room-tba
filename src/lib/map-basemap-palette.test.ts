import { describe, expect, test } from "bun:test";
import type maplibregl from "maplibre-gl";
import {
  BASEMAP_DARK_GENERIC,
  BASEMAP_DARK_LAYER_PAINT,
  BASEMAP_LAYER_PAINT,
  uplbNight,
} from "@constants/map-basemap-palette";
import {
  applyBasemapPalette,
  genericDarkPaint,
  syncBasemapPalette,
} from "./map-basemap-palette";

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

describe("syncBasemapPalette", () => {
  /** A map that may already be past "load", with or without its layers. */
  function liveMap(initial: Layer[]) {
    let layers = initial;
    const { state } = fakeMap([], STYLE_PAINT);
    const handlers = new Map<string, Set<() => void>>();
    let writes = 0;
    const map = {
      getLayer: (id: string) => layers.find((l) => l.id === id),
      getLayersOrder: () => layers.map((l) => l.id),
      getSource: (id: string) =>
        id === "openmaptiles" ? { type: "vector" } : { type: "geojson" },
      getStyle: () => ({
        sources: {
          openmaptiles: { type: "vector" },
          campus: { type: "geojson" },
        },
        layers,
      }),
      getPaintProperty: (id: string, prop: string) => state[id]?.[prop],
      setPaintProperty: (id: string, prop: string, value: unknown) => {
        writes++;
        state[id] ??= {};
        state[id][prop] = value;
      },
      setLayoutProperty: () => {},
      on: (event: string, fn: () => void) => {
        if (!handlers.has(event)) handlers.set(event, new Set());
        handlers.get(event)?.add(fn);
      },
      off: (event: string, fn: () => void) => handlers.get(event)?.delete(fn),
    };
    return {
      map: map as unknown as maplibregl.Map,
      state,
      writes: () => writes,
      setLayers: (next: Layer[]) => {
        layers = next;
      },
      emit: (event: string) => {
        for (const fn of handlers.get(event) ?? []) fn();
      },
      listeners: () =>
        [...handlers.values()].reduce((n, set) => n + set.size, 0),
    };
  }

  const DARK_BG = BASEMAP_DARK_LAYER_PAINT["background"]?.["background-color"];
  const BASEMAP: Layer[] = [
    { id: "background", type: "background", source: "openmaptiles" },
    { id: "road_label", type: "symbol", source: "openmaptiles" },
  ];

  test("applies right away when the style is in place (load already fired)", () => {
    const live = liveMap(BASEMAP);
    syncBasemapPalette(live.map, () => "dark");
    expect(live.state["background"]?.["background-color"]).toBe(DARK_BG);
  });

  test("waits for the layers, then applies on styledata", () => {
    const live = liveMap([]);
    syncBasemapPalette(live.map, () => "dark");
    expect(live.writes()).toBe(0);
    live.setLayers(BASEMAP);
    live.emit("styledata");
    expect(live.state["background"]?.["background-color"]).toBe(DARK_BG);
  });

  test("skips repeat styledata and app overlays; repaints new basemap layers", () => {
    const live = liveMap(BASEMAP);
    syncBasemapPalette(live.map, () => "dark");
    const after = live.writes();
    live.emit("styledata");
    live.setLayers([
      ...BASEMAP,
      { id: "campus-pins", type: "symbol", source: "campus" },
    ]);
    live.emit("styledata");
    expect(live.writes()).toBe(after);

    live.setLayers([
      ...BASEMAP,
      { id: "bridge_street", type: "line", source: "openmaptiles" },
    ]);
    live.emit("styledata");
    expect(live.state["bridge_street"]?.["line-color"]).toBe(
      BASEMAP_DARK_GENERIC.road,
    );
  });

  test("sync() follows a theme change; stop() detaches", () => {
    let theme: "light" | "dark" = "dark";
    const live = liveMap(BASEMAP);
    const palette = syncBasemapPalette(live.map, () => theme);
    theme = "light";
    palette.sync();
    expect(live.state["background"]?.["background-color"]).toBe(
      BASEMAP_LAYER_PAINT["background"]?.["background-color"],
    );
    palette.stop();
    expect(live.listeners()).toBe(0);
  });
});
