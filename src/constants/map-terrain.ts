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
