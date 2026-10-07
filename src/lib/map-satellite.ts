import type maplibregl from "maplibre-gl";
import { hasConfiguredMaptilerKey, withMaptilerKey } from "./maptiler-key";

export const SATELLITE_SOURCE_ID = "satellite-basemap";
export const SATELLITE_LAYER_ID = "satellite-basemap";

/**
 * MapTiler satellite TileJSON — same source their own hybrid style uses.
 * The placeholder is swapped for PUBLIC_MAPTILER_KEY at runtime, matching
 * every other keyed URL in the app.
 */
const SATELLITE_TILEJSON_URL =
  "https://api.maptiler.com/tiles/satellite-v2/tiles.json?key=__MAPTILER_KEY__";

const currentSourceUrls = new WeakMap<maplibregl.Map, string>();

type StyleLayer = { id: string; type: string; source?: unknown };

/** Basemap layers draw from vector tiles; app layers draw from GeoJSON. */
function isBasemapLayer(map: maplibregl.Map, layer: StyleLayer): boolean {
  if (typeof layer.source !== "string") return true;
  return map.getSource(layer.source)?.type !== "geojson";
}

function basemapLayers(map: maplibregl.Map): StyleLayer[] {
  return (map.getStyle().layers as StyleLayer[]).filter((layer) =>
    isBasemapLayer(map, layer),
  );
}

/**
 * Where the imagery goes: above every basemap fill, road and building
 * (including the 3D extrusions, which otherwise paint grey boxes over the
 * photo), below the first basemap label after them. The first symbol overall
 * is a one-way arrow tucked between the road layers, so inserting there left
 * bridges and buildings drawn on top of the imagery.
 */
function satelliteBeforeId(map: maplibregl.Map): string | undefined {
  const layers = basemapLayers(map);
  let lastBuilding = -1;
  layers.forEach((layer, index) => {
    if (layer.type === "fill-extrusion" || layer.id.startsWith("building")) {
      lastBuilding = index;
    }
  });
  return (
    layers.find(
      (layer, index) => index > lastBuilding && layer.type === "symbol",
    )?.id ?? layers.find((layer) => layer.type === "symbol")?.id
  );
}

/** Hybrid label paint: white text on a dark halo reads on any imagery. */
export const HYBRID_LABEL_PAINT = {
  "text-color": "#ffffff",
  "text-halo-color": "rgba(0, 0, 0, 0.82)",
  "text-halo-width": 1.6,
} as const;

/** Each map's basemap label paint from before hybrid mode, to restore. */
const savedLabelPaint = new WeakMap<
  maplibregl.Map,
  Map<string, Record<string, unknown>>
>();

/**
 * Hybrid view, Google Maps style: road and place labels stay on top of the
 * imagery, recoloured so the grey-on-white basemap text does not vanish into
 * dark tree cover. Restores the original paint when satellite turns off.
 */
function syncHybridLabels(map: maplibregl.Map, hybrid: boolean): void {
  const saved = savedLabelPaint.get(map);
  if (!hybrid) {
    if (!saved) return;
    for (const [layerId, paint] of saved) {
      if (!map.getLayer(layerId)) continue;
      for (const [property, value] of Object.entries(paint)) {
        map.setPaintProperty(layerId, property, value);
      }
    }
    savedLabelPaint.delete(map);
    return;
  }
  if (saved) return;
  const next = new Map<string, Record<string, unknown>>();
  for (const layer of basemapLayers(map)) {
    if (layer.type !== "symbol") continue;
    const original: Record<string, unknown> = {};
    for (const [property, value] of Object.entries(HYBRID_LABEL_PAINT)) {
      original[property] = map.getPaintProperty(layer.id, property);
      map.setPaintProperty(layer.id, property, value);
    }
    next.set(layer.id, original);
  }
  savedLabelPaint.set(map, next);
}

/**
 * Show or hide satellite imagery as a hybrid view.
 *
 * The raster layer sits above the basemap's ground, roads and buildings and
 * below its labels (see satelliteBeforeId), and the labels switch to a
 * light-on-dark paint while it shows. App layers (pins, routes) are added
 * after the style and always sit above it. The source is added lazily on
 * first use so users who never toggle satellite never fetch imagery tiles.
 * Idempotent.
 */
export function syncSatelliteLayer(
  map: maplibregl.Map,
  visible: boolean,
  historicalTileUrl?: string | null,
): void {
  // Without a key there is no imagery to point at, and building the URL
  // throws. Keyless deployments (E2E, forks on the fallback basemap) run
  // this on every map load with satellite off, so bail before touching it.
  if (!historicalTileUrl && !hasConfiguredMaptilerKey()) return;
  const sourceUrl =
    historicalTileUrl ?? withMaptilerKey(SATELLITE_TILEJSON_URL);
  if (
    map.getLayer(SATELLITE_LAYER_ID) &&
    currentSourceUrls.get(map) !== sourceUrl
  ) {
    map.removeLayer(SATELLITE_LAYER_ID);
    if (map.getSource(SATELLITE_SOURCE_ID))
      map.removeSource(SATELLITE_SOURCE_ID);
  }
  if (!map.getLayer(SATELLITE_LAYER_ID)) {
    if (!visible) {
      syncHybridLabels(map, false);
      return;
    }
    if (!map.getSource(SATELLITE_SOURCE_ID)) {
      map.addSource(SATELLITE_SOURCE_ID, {
        type: "raster",
        ...(historicalTileUrl
          ? { tiles: [historicalTileUrl], tileSize: 256 }
          : { url: sourceUrl }),
      });
    }
    map.addLayer(
      { id: SATELLITE_LAYER_ID, type: "raster", source: SATELLITE_SOURCE_ID },
      satelliteBeforeId(map),
    );
    currentSourceUrls.set(map, sourceUrl);
  }
  map.setLayoutProperty(
    SATELLITE_LAYER_ID,
    "visibility",
    visible ? "visible" : "none",
  );
  syncHybridLabels(map, visible);
}
