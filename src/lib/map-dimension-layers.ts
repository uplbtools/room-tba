import type { Map as MapLibreMap } from "maplibre-gl";
import {
  BUILDING_3D_LAYER_ID,
  BUILDING_FILL_LAYER_ID,
  BUILDING_FILL_MAX_ZOOM_2D,
  BUILDING_FILL_MAX_ZOOM_3D,
  BUILDING_FILL_MIN_ZOOM,
} from "@constants/map-dimension";

function setLayerVisibility(
  map: MapLibreMap,
  layerId: string,
  visible: boolean,
): void {
  if (!map.getLayer(layerId)) return;
  map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
}

function enableBuildingFillLayer(map: MapLibreMap): void {
  if (!map.getLayer(BUILDING_FILL_LAYER_ID)) return;
  map.setLayoutProperty(BUILDING_FILL_LAYER_ID, "visibility", "visible");
  map.setLayerZoomRange(
    BUILDING_FILL_LAYER_ID,
    BUILDING_FILL_MIN_ZOOM,
    BUILDING_FILL_MAX_ZOOM_2D,
  );
}

function restoreBuildingFillLayerFor3D(map: MapLibreMap): void {
  if (!map.getLayer(BUILDING_FILL_LAYER_ID)) return;
  map.setLayoutProperty(BUILDING_FILL_LAYER_ID, "visibility", "visible");
  map.setLayerZoomRange(
    BUILDING_FILL_LAYER_ID,
    BUILDING_FILL_MIN_ZOOM,
    BUILDING_FILL_MAX_ZOOM_3D,
  );
}

/**
 * Keep basemap buildings flat in 2D (or terrain mode) and extruded in tilted 3D.
 * Idempotent — safe to call on pitch/move events and dimension toggles.
 */
export function syncBuildingLayersForDimension(
  map: MapLibreMap,
  is2D: boolean,
  terrainEnabled: boolean,
): void {
  const showFlatBuildings = is2D || terrainEnabled;
  const showExtrudedBuildings = !is2D && !terrainEnabled;

  setLayerVisibility(map, BUILDING_3D_LAYER_ID, showExtrudedBuildings);

  if (showFlatBuildings) {
    enableBuildingFillLayer(map);
  } else {
    restoreBuildingFillLayerFor3D(map);
  }
}

/** Apply flat 2D building layers immediately (before pitch animation). */
export function enterFlatMapDimension(
  map: MapLibreMap,
  terrainEnabled: boolean,
): void {
  syncBuildingLayersForDimension(map, true, terrainEnabled);
}

/** Restore tilted 3D building layers after pitch animation completes. */
export function enterTiltedMapDimension(
  map: MapLibreMap,
  terrainEnabled: boolean,
): void {
  syncBuildingLayersForDimension(map, false, terrainEnabled);
}
