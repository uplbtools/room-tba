import type maplibregl from "maplibre-gl";
import {
  BASEMAP_DARK_GENERIC,
  BASEMAP_DARK_LAYER_PAINT,
  BASEMAP_LAYER_PAINT,
  BASEMAP_RECESS_LAYER_IDS,
  type BasemapPaint,
} from "@constants/map-basemap-palette";
import type { ResolvedTheme } from "@lib/theme";

type PaintValue = Parameters<maplibregl.Map["setPaintProperty"]>[2];

/**
 * Paint values a dark pass replaced, per map, so switching back to light puts
 * every touched property back exactly (including layers outside the light
 * table, whose originals come from the style itself).
 */
const lightOriginals = new WeakMap<
  maplibregl.Map,
  Map<string, Map<string, PaintValue>>
>();

function setPaint(
  map: maplibregl.Map,
  layerId: string,
  property: string,
  value: PaintValue,
  remember: boolean,
): void {
  if (remember) {
    let byLayer = lightOriginals.get(map);
    if (!byLayer) {
      byLayer = new Map();
      lightOriginals.set(map, byLayer);
    }
    let props = byLayer.get(layerId);
    if (!props) {
      props = new Map();
      byLayer.set(layerId, props);
    }
    if (!props.has(property)) {
      props.set(
        property,
        map.getPaintProperty(layerId, property) as PaintValue,
      );
    }
  }
  map.setPaintProperty(layerId, property, value);
}

function applyTable(
  map: maplibregl.Map,
  table: BasemapPaint,
  remember: boolean,
): void {
  for (const [layerId, paint] of Object.entries(table)) {
    if (!map.getLayer(layerId)) continue;
    for (const [property, value] of Object.entries(paint)) {
      setPaint(map, layerId, property, value as PaintValue, remember);
    }
  }
}

/**
 * Dark paint for a basemap layer the dark table does not name, chosen from
 * its type and id. Returns null for layers that should keep their paint.
 */
export function genericDarkPaint(layer: {
  id: string;
  type: string;
}): Record<string, string> | null {
  const { id, type } = layer;
  // Shields draw dark text on a white badge; recoloring the text would erase it.
  if (type === "symbol" && !/shield/.test(id)) {
    return {
      "text-color": BASEMAP_DARK_GENERIC.symbolText,
      "text-halo-color": BASEMAP_DARK_GENERIC.symbolHalo,
    };
  }
  if (
    type === "line" &&
    /road|bridge|tunnel|street|highway|path|link/.test(id)
  ) {
    return {
      "line-color": /casing/.test(id)
        ? BASEMAP_DARK_GENERIC.casing
        : BASEMAP_DARK_GENERIC.road,
    };
  }
  if (type === "fill" && /landuse|landcover|aeroway|residential/.test(id)) {
    return { "fill-color": BASEMAP_DARK_GENERIC.fill };
  }
  return null;
}

/** Ids of layers drawn from the basemap's vector tiles (not app overlays). */
function basemapLayers(map: maplibregl.Map): { id: string; type: string }[] {
  const style = map.getStyle();
  if (!style) return [];
  const vectorSources = new Set(
    Object.entries(style.sources ?? {})
      .filter(([, source]) => (source as { type?: string }).type === "vector")
      .map(([id]) => id),
  );
  return (style.layers ?? []).filter(
    (layer: { id: string; type: string; source?: unknown }) =>
      "source" in layer &&
      typeof layer.source === "string" &&
      vectorSources.has(layer.source),
  );
}

/**
 * Apply basemap paint overrides for the theme after the style loads.
 * Idempotent, and safe to call again whenever the theme changes.
 */
export function applyBasemapPalette(
  map: maplibregl.Map,
  theme: ResolvedTheme = "light",
): void {
  // Undo any earlier dark pass first, then lay down the light table: the
  // light state is always the base the dark pass records and builds on.
  const remembered = lightOriginals.get(map);
  if (remembered) {
    for (const [layerId, props] of remembered) {
      if (!map.getLayer(layerId)) continue;
      for (const [property, value] of props) {
        map.setPaintProperty(layerId, property, value);
      }
    }
    lightOriginals.delete(map);
  }
  applyTable(map, BASEMAP_LAYER_PAINT, false);

  if (theme === "dark") {
    for (const layer of basemapLayers(map)) {
      if (BASEMAP_DARK_LAYER_PAINT[layer.id]) continue;
      const paint = genericDarkPaint(layer);
      if (!paint) continue;
      for (const [property, value] of Object.entries(paint)) {
        setPaint(map, layer.id, property, value, true);
      }
    }
    applyTable(map, BASEMAP_DARK_LAYER_PAINT, true);
  }

  for (const layerId of BASEMAP_RECESS_LAYER_IDS) {
    if (!map.getLayer(layerId)) continue;
    map.setLayoutProperty(layerId, "visibility", "none");
  }
}

/** Ids of the basemap's vector layers, in draw order (cheap: no serialize). */
function basemapLayerKey(map: maplibregl.Map): string {
  let order: string[];
  try {
    order = map.getLayersOrder();
  } catch {
    return "";
  }
  return order
    .filter((id) => {
      const source = (map.getLayer(id) as { source?: unknown } | undefined)
        ?.source;
      return (
        typeof source === "string" && map.getSource(source)?.type === "vector"
      );
    })
    .join(",");
}

/**
 * Keep the theme's palette on the basemap for the life of the map.
 *
 * Waiting for the map's "load" event alone was not enough: the map can reach
 * the app after "load" has already fired, while isStyleLoaded() still reads
 * false because the app's own GeoJSON sources are loading. "load" then never
 * comes again, the palette is never applied, and a dark-mode deep link (most
 * visibly /transit/…) kept the light basemap and its cream 3D buildings.
 * This applies as soon as the style's layers exist, and again on any
 * "styledata" that adds or replaces basemap layers. Repeat events with the
 * same theme and layers are skipped, so app overlays changing do not repaint.
 * Call sync() after a theme change; stop() detaches.
 */
export function syncBasemapPalette(
  map: maplibregl.Map,
  theme: () => ResolvedTheme,
): { sync: () => void; stop: () => void } {
  let applied = "";
  const sync = () => {
    const layers = basemapLayerKey(map);
    if (!layers) return;
    const key = `${theme()}|${layers}`;
    if (key === applied) return;
    // Marked first: our own paint writes may emit styledata re-entrantly.
    applied = key;
    try {
      applyBasemapPalette(map, theme());
    } catch {
      // Style mid-swap ("Style is not done loading"): the next styledata retries.
      applied = "";
    }
  };
  map.on("styledata", sync);
  map.on("load", sync);
  sync();
  return {
    sync,
    stop: () => {
      map.off("styledata", sync);
      map.off("load", sync);
    },
  };
}
