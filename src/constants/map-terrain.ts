const MAPTILER_KEY = "B6m4DQknxd9wZ70DnDV4";

export const TERRAIN_SOURCE_ID = "makiling-terrain-dem";
export const TERRAIN_HILLSHADE_LAYER_ID = "makiling-terrain-hillshade";
export const TERRAIN_HILLSHADE_BEFORE_LAYER_ID = "road_area_pattern";
export const TERRAIN_TILEJSON_URL = `https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=${MAPTILER_KEY}`;

export const TERRAIN_EXAGGERATION_OPTIONS = [1, 1.5, 2] as const;
export const DEFAULT_TERRAIN_EXAGGERATION = 1.5;

export const CAMPUS_MAX_BOUNDS: [[number, number], [number, number]] = [
  // West/south: Mt. Makiling foothills, BSP Jamboree site, National Arts Center corridor.
  [121.168, 14.095],
  [121.335, 14.215],
];

/** Flat object form for bounds checks (offline tiles, geolocation, admin APIs). */
export const CAMPUS_BOUNDS = {
  minLng: CAMPUS_MAX_BOUNDS[0][0],
  minLat: CAMPUS_MAX_BOUNDS[0][1],
  maxLng: CAMPUS_MAX_BOUNDS[1][0],
  maxLat: CAMPUS_MAX_BOUNDS[1][1],
} as const;

export const CAMPUS_DEFAULT_CAMERA = {
  center: [121.24125948460573, 14.16323736946326] as [number, number],
  zoom: 15.81,
  pitch: 60,
  bearing: -154.48,
};

export const MAKILING_TERRAIN_MAX_BOUNDS: [[number, number], [number, number]] =
  [
    [121.168, 14.095],
    [121.34, 14.22],
  ];

export const MAKILING_TERRAIN_SOURCE_BOUNDS = [
  MAKILING_TERRAIN_MAX_BOUNDS[0][0],
  MAKILING_TERRAIN_MAX_BOUNDS[0][1],
  MAKILING_TERRAIN_MAX_BOUNDS[1][0],
  MAKILING_TERRAIN_MAX_BOUNDS[1][1],
] as [number, number, number, number];

export const MAKILING_TERRAIN_CAMERA = {
  center: [121.218, 14.142] as [number, number],
  zoom: 13.25,
  pitch: 68,
  bearing: 190,
};

export const TERRAIN_UNAVAILABLE_OFFLINE_MESSAGE =
  "Terrain needs an internet connection for hosted elevation tiles.";

export const TERRAIN_TILE_FAILURE_MESSAGE =
  "Terrain tiles could not load. The flat map is still available.";
