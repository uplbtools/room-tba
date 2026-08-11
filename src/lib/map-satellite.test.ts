import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type maplibregl from "maplibre-gl";
import {
  SATELLITE_LAYER_ID,
  SATELLITE_SOURCE_ID,
  syncSatelliteLayer,
} from "@lib/map-satellite";

const realKey = process.env.PUBLIC_MAPTILER_KEY;

type FakeLayer = { id: string; type: string; visibility?: string };

/** The slice of maplibregl.Map the sync function touches, ordered like a style. */
function fakeMap(layers: FakeLayer[]) {
  const sources = new Map<string, unknown>();
  return {
    layers,
    sources,
    getLayer: (id: string) => layers.find((layer) => layer.id === id),
    getSource: (id: string) => sources.get(id),
    addSource: (id: string, source: unknown) => sources.set(id, source),
    removeSource: (id: string) => sources.delete(id),
    addLayer: (layer: FakeLayer, beforeId?: string) => {
      const at = beforeId
        ? layers.findIndex((existing) => existing.id === beforeId)
        : layers.length;
      layers.splice(at === -1 ? layers.length : at, 0, layer);
    },
    removeLayer: (id: string) => {
      const index = layers.findIndex((layer) => layer.id === id);
      if (index !== -1) layers.splice(index, 1);
    },
    getStyle: () => ({ layers }),
    setLayoutProperty: (id: string, _prop: string, value: string) => {
      const layer = layers.find((existing) => existing.id === id);
      if (layer) layer.visibility = value;
    },
  };
}

type MapStub = ReturnType<typeof fakeMap>;
const asMap = (map: MapStub) => map as unknown as maplibregl.Map;

const baseLayers = (): FakeLayer[] => [
  { id: "background", type: "background" },
  { id: "water", type: "fill" },
  { id: "road-label", type: "symbol" },
  { id: "place-label", type: "symbol" },
];

describe("syncSatelliteLayer", () => {
  beforeEach(() => {
    process.env.PUBLIC_MAPTILER_KEY = "test-key-123";
  });

  afterEach(() => {
    process.env.PUBLIC_MAPTILER_KEY = realKey;
  });

  test("never adds the source while satellite stays off", () => {
    const map = fakeMap(baseLayers());
    syncSatelliteLayer(asMap(map), false);
    expect(map.sources.size).toBe(0);
    expect(map.getLayer(SATELLITE_LAYER_ID)).toBeUndefined();
  });

  test("inserts the raster layer before the first symbol layer", () => {
    const map = fakeMap(baseLayers());
    syncSatelliteLayer(asMap(map), true);
    const ids = map.layers.map((layer) => layer.id);
    expect(ids).toEqual([
      "background",
      "water",
      SATELLITE_LAYER_ID,
      "road-label",
      "place-label",
    ]);
    const source = JSON.stringify(map.sources.get(SATELLITE_SOURCE_ID));
    expect(source).toContain("key=test-key-123");
    expect(source).not.toContain("__MAPTILER_KEY__");
  });

  test("appends on top when the style has no symbol layers", () => {
    const map = fakeMap([{ id: "background", type: "background" }]);
    syncSatelliteLayer(asMap(map), true);
    expect(map.layers.at(-1)?.id).toBe(SATELLITE_LAYER_ID);
  });

  test("toggles visibility without duplicating the layer", () => {
    const map = fakeMap(baseLayers());
    syncSatelliteLayer(asMap(map), true);
    syncSatelliteLayer(asMap(map), false);
    syncSatelliteLayer(asMap(map), true);
    const satelliteLayers = map.layers.filter(
      (layer) => layer.id === SATELLITE_LAYER_ID,
    );
    expect(satelliteLayers).toHaveLength(1);
    expect(satelliteLayers[0]?.visibility).toBe("visible");
  });

  test("replaces MapTiler tiles with a selected Wayback release", () => {
    const map = fakeMap(baseLayers());
    const waybackTileUrl =
      "https://wayback.maptiles.arcgis.com/tile/123/{z}/{y}/{x}";
    syncSatelliteLayer(asMap(map), true);
    syncSatelliteLayer(asMap(map), true, waybackTileUrl);

    expect(
      map.layers.filter((layer) => layer.id === SATELLITE_LAYER_ID),
    ).toHaveLength(1);
    expect(map.sources.get(SATELLITE_SOURCE_ID)).toEqual({
      type: "raster",
      tiles: [waybackTileUrl],
      tileSize: 256,
    });
  });
});
