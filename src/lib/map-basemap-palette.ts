import type maplibregl from "maplibre-gl";
import {
  BASEMAP_LAYER_PAINT,
  BASEMAP_RECESS_LAYER_IDS,
} from "@constants/map-basemap-palette";

/** Apply basemap paint overrides after the style loads. Idempotent. */
export function applyBasemapPalette(map: maplibregl.Map): void {
  for (const [layerId, paint] of Object.entries(BASEMAP_LAYER_PAINT)) {
    if (!map.getLayer(layerId)) continue;
    for (const [property, value] of Object.entries(paint)) {
      map.setPaintProperty(layerId, property, value);
    }
  }

  for (const layerId of BASEMAP_RECESS_LAYER_IDS) {
    if (!map.getLayer(layerId)) continue;
    map.setLayoutProperty(layerId, "visibility", "none");
  }
}
