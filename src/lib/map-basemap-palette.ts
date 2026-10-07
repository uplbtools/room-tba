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
      .filter(([, source]) => source.type === "vector")
      .map(([id]) => id),
  );
  return (style.layers ?? []).filter(
    (layer) =>
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
