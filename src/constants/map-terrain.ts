import { withMaptilerKey } from "@lib/maptiler-key";
import { campusMap, campusTerrain } from "../campus.config";

/** Campus-specific terrain values live in campusTerrain (src/campus.config.ts). */
export const TERRAIN_ENABLED = campusTerrain.enabled;

export const TERRAIN_SOURCE_ID = "campus-terrain-dem";
export const TERRAIN_HILLSHADE_LAYER_ID = "campus-terrain-hillshade";
export const TERRAIN_HILLSHADE_BEFORE_LAYER_ID = "road_area_pattern";

export function getTerrainTileJsonUrl(): string {
  return withMaptilerKey(campusTerrain.demTilesUrl);
}

export const TERRAIN_EXAGGERATION_OPTIONS = [1, 1.5, 2] as const;
export const DEFAULT_TERRAIN_EXAGGERATION = 1.5;

export const CAMPUS_MAX_BOUNDS: [[number, number], [number, number]] =
  campusMap.maxBounds;

/** Flat object form for bounds checks (offline tiles, geolocation, admin APIs). */
export const CAMPUS_BOUNDS = {
  minLng: CAMPUS_MAX_BOUNDS[0][0],
  minLat: CAMPUS_MAX_BOUNDS[0][1],
  maxLng: CAMPUS_MAX_BOUNDS[1][0],
  maxLat: CAMPUS_MAX_BOUNDS[1][1],
} as const;

export const CAMPUS_DEFAULT_CAMERA = campusMap.defaultCamera;

/**
 * How far the map itself may pan and zoom out. Campus stays the default view
 * (and CAMPUS_BOUNDS still scopes geolocation, offline tiles and editing),
 * but the jeepney and bus routes run to Metro Manila, Calamba, San Pablo and
 * Sta. Cruz: locked to campus, those routes opened on an empty map.
 */
// Generous margins: maxBounds limits the whole viewport, and on a phone the
// sheet covers its lower half, so a route's south end only clears the sheet
// when the map may show well past it.
export const MAP_REGION_MAX_BOUNDS: [[number, number], [number, number]] = [
  [120.3, 13.3],
  [122.2, 15.3],
];
/** Low enough to frame Los Baños to UP Diliman on a phone. */
export const MAP_REGION_MIN_ZOOM = 8;

export const TERRAIN_MAX_BOUNDS: [[number, number], [number, number]] =
  campusTerrain.maxBounds;

export const TERRAIN_SOURCE_BOUNDS = [
  TERRAIN_MAX_BOUNDS[0][0],
  TERRAIN_MAX_BOUNDS[0][1],
  TERRAIN_MAX_BOUNDS[1][0],
  TERRAIN_MAX_BOUNDS[1][1],
] as [number, number, number, number];

export const TERRAIN_CAMERA = campusTerrain.camera;

export const TERRAIN_UNAVAILABLE_OFFLINE_MESSAGE =
  "Terrain needs an internet connection for hosted elevation tiles.";

export const TERRAIN_TILE_FAILURE_MESSAGE =
  "Terrain tiles could not load. The flat map is still available.";
