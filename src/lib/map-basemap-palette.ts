import type maplibregl from "maplibre-gl";
import { BASEMAP_LAYER_PAINT } from "@constants/map-basemap-palette";

/** Apply muted basemap paint overrides after the style loads. Idempotent. */
export function applyBasemapPalette(map: maplibregl.Map): void {
  for (const [layerId, paint] of Object.entries(BASEMAP_LAYER_PAINT)) {
    if (!map.getLayer(layerId)) continue;
    for (const [property, value] of Object.entries(paint)) {
      map.setPaintProperty(layerId, property, value);
    }
  }
}
