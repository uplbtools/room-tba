/**
 * Muted OSM Liberty basemap palette for campus viewing.
 *
 * Tuned to reduce eye strain from high-luminance greens, pure-white roads, and
 * near-white 3D extrusions while keeping labels and pins readable. Values are
 * applied at runtime (see applyBasemapPalette) and mirrored in
 * public/liberty-customized.json for offline tile styling.
 *
 * A full dark or high-contrast theme would need a separate style variant and
 * user preference — these are subtle warm/desaturated adjustments only.
 */
export const MAP_BASEMAP_PALETTE = {
  background: "rgb(228, 224, 216)",
  grassFill: "rgba(150, 168, 132, 1)",
  grassOpacity: 0.28,
  parkFill: "#c5d4b5",
  parkOutline: "rgba(118, 148, 108, 0.75)",
  woodFill: "rgba(95, 155, 105, 0.55)",
  woodOpacity: 0.38,
  waterFill: "rgba(145, 185, 205, 1)",
  waterwayLine: "#96b8d4",
  schoolFill: "rgb(218, 216, 188)",
  pitchFill: "rgba(140, 170, 128, 1)",
  buildingFill: "hsl(35, 10%, 78%)",
  buildingExtrusion: "rgba(230, 222, 210, 1)",
  buildingExtrusionOpacity: 0.82,
  roadMinor: "hsl(35, 12%, 92%)",
  roadService: "hsl(35, 12%, 92%)",
  roadPathPedestrian: "hsl(35, 10%, 93%)",
  roadSecondaryTertiary: "rgba(200, 196, 188, 1)",
} as const;

/** Layer paint overrides keyed by MapLibre layer id. */
export const BASEMAP_LAYER_PAINT: Record<
  string,
  Record<string, string | number>
> = {
  background: {
    "background-color": MAP_BASEMAP_PALETTE.background,
  },
  landcover_grass: {
    "fill-color": MAP_BASEMAP_PALETTE.grassFill,
    "fill-opacity": MAP_BASEMAP_PALETTE.grassOpacity,
  },
  park: {
    "fill-color": MAP_BASEMAP_PALETTE.parkFill,
    "fill-outline-color": MAP_BASEMAP_PALETTE.parkOutline,
  },
  landcover_wood: {
    "fill-color": MAP_BASEMAP_PALETTE.woodFill,
    "fill-opacity": MAP_BASEMAP_PALETTE.woodOpacity,
  },
  water: {
    "fill-color": MAP_BASEMAP_PALETTE.waterFill,
  },
  waterway_river: {
    "line-color": MAP_BASEMAP_PALETTE.waterwayLine,
  },
  waterway_other: {
    "line-color": MAP_BASEMAP_PALETTE.waterwayLine,
  },
  waterway_tunnel: {
    "line-color": MAP_BASEMAP_PALETTE.waterwayLine,
  },
  landuse_school: {
    "fill-color": MAP_BASEMAP_PALETTE.schoolFill,
  },
  landuse_pitch: {
    "fill-color": MAP_BASEMAP_PALETTE.pitchFill,
  },
  building: {
    "fill-color": MAP_BASEMAP_PALETTE.buildingFill,
  },
  "building-3d": {
    "fill-extrusion-color": MAP_BASEMAP_PALETTE.buildingExtrusion,
    "fill-extrusion-opacity": MAP_BASEMAP_PALETTE.buildingExtrusionOpacity,
  },
  road_minor: {
    "line-color": MAP_BASEMAP_PALETTE.roadMinor,
  },
  road_service_track: {
    "line-color": MAP_BASEMAP_PALETTE.roadService,
  },
  road_path_pedestrian: {
    "line-color": MAP_BASEMAP_PALETTE.roadPathPedestrian,
  },
  road_secondary_tertiary: {
    "line-color": MAP_BASEMAP_PALETTE.roadSecondaryTertiary,
  },
  tunnel_minor: {
    "line-color": MAP_BASEMAP_PALETTE.roadMinor,
  },
  tunnel_service_track: {
    "line-color": MAP_BASEMAP_PALETTE.roadService,
  },
  tunnel_path_pedestrian: {
    "line-color": MAP_BASEMAP_PALETTE.roadPathPedestrian,
  },
};
