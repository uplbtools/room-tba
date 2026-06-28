/**
 * Experimental basemap palette — Jun 2026.
 *
 * UPLB campus viewing: airy green-tinted ground, natural lawn, light campus
 * stone buildings that read architectural against grass. Applied at runtime
 * via applyBasemapPalette() and mirrored in public/liberty-customized.json
 * for offline tiles. Pin/label colors are unchanged; maroon pins (#7b1113) stay
 * readable on both the green lawn and warm building fills.
 *
 * Building fill/extrusion colors scale with OpenMapTiles `render_height` (m)
 * when MAP_BASEMAP_BUILDING_SIZE_COLORS is true — see BUILDING_SIZE_COLOR_EXPRESSION.
 *
 * Swap MAP_BASEMAP_PALETTE with a preset below to try alternates.
 */

import type { ExpressionSpecification } from "maplibre-gl";

/** OSM Liberty defaults (reference only — rejected neon grass):
 *  background rgb(239,239,239) · grass rgba(177,255,142,0.3) · water rgba(164,219,255,1)
 *  building hsl(35,8%,85%) · extrusion rgba(247,242,235,1) · roads near-white / #fea
 */
// export const MAP_BASEMAP_PALETTE = { ... } as const; // osm-liberty-neon-rejected

/** Prior subtle pass (commit 9d1dc52):
 *  background rgb(228,224,216) · grass rgba(150,168,132,0.28) · water rgba(145,185,205,1)
 *  building hsl(35,10%,78%) · extrusion rgba(230,222,210,0.82)
 */
// export const MAP_BASEMAP_PALETTE = { ... } as const; // subtle-warm

/** Cool dusk alternate:
 *  background rgb(208,212,218) · grass rgba(118,138,128,0.26) · water rgba(108,132,152,1)
 *  building #dce0e4 · extrusion rgba(208,212,218,0.88) · roads hsl(220,6%,86%)
 */
// export const MAP_BASEMAP_PALETTE = { ... } as const; // cool-dusk

/** Rejected Jun 2026 — warm sage read as too green:
 *  background rgb(214,210,200) · grass rgba(132,145,112,1) · park #b4c0a4 · wood rgba(98,128,92,0.48)
 *  pitch rgba(100,122,92,1) · landuseTrack #b8c0a8 · building #c8beb0 · extrusion #beb2a0
 */
// export const MAP_BASEMAP_PALETTE = { ... } as const; // warm-sage-rejected

/** Rejected Jun 2026 — warm stone read as too brown/ochre:
 *  background rgb(212,207,196) · grass rgba(194,182,162,1) · park #d6cab6 · building #e8e4e0 · extrusion #dcd4c8
 *  roads hsl(35,5%,88%) · motorway rgba(186,162,124,1)
 */
// export const MAP_BASEMAP_PALETTE = { ... } as const; // warm-stone-rejected

/** Rejected Jun 2026 — paper floor still too warm; buildings too brown:
 *  background rgb(234,232,228) · building #aa9e90 · extrusion #958874 · roads hsl(40,4%,86%)
 */
// export const MAP_BASEMAP_PALETTE = { ... } as const; // paper-floor-warm-rejected

/** Rejected Jun 2026 — neutral greige insufficient ground/building contrast:
 *  background rgb(226,224,220) · building #d4d0ca · extrusion #c8c4be · outline hsl(220,4%,48%)
 */
// export const MAP_BASEMAP_PALETTE = { ... } as const; // neutral-greige-rejected

/** Rejected Jun 2026 — cool paper inverted hierarchy (dark blocks on white sand):
 *  background rgb(236,238,240) · building #a8adb2 · extrusion #94999e · outline hsl(220,10%,30%)
 */
// export const MAP_BASEMAP_PALETTE = { ... } as const; // cool-paper-rejected

/** Prior alternate — morning-mist ground with warm stone buildings (superseded by uplbRefreshing):
 *  background rgb(232,237,230) · grass rgba(156,184,150,0.24) · building #e2ddd4 · extrusion #d4cec4
 */
export const uplbFresh = {
  background: "rgb(232, 237, 230)",
  grassFill: "rgba(156, 184, 150, 1)",
  grassOpacity: 0.24,
  parkFill: "#a8b89c",
  parkOutline: "rgba(120, 138, 112, 0.45)",
  parkOutlineLine: "#b8c8b0",
  woodFill: "rgba(88, 108, 82, 0.42)",
  woodOpacity: 0.38,
  waterFill: "rgba(118, 158, 152, 1)",
  waterOutline: "rgba(88, 128, 122, 0.5)",
  waterwayLine: "#7aada4",
  schoolFill: "rgb(232, 237, 230)",
  pitchFill: "rgba(168, 184, 156, 1)",
  landuseTrack: "#c4d0bc",
  buildingFill: "#e2ddd4",
  buildingOutline: "hsl(35, 8%, 58%)",
  buildingExtrusion: "#d4cec4",
  buildingExtrusionOpacity: 0.92,
  labelText: "#444444",
  labelHaloColor: "rgba(255, 255, 255, 0.92)",
  labelHaloWidth: 1.4,
  roadMinor: "hsl(40, 5%, 88%)",
  roadService: "hsl(40, 5%, 88%)",
  roadPathPedestrian: "rgba(180, 178, 172, 0.72)",
  roadSecondaryTertiary: "rgba(200, 196, 188, 1)",
  roadMinorCasing: "rgba(168, 164, 156, 0.8)",
  roadSecondaryTertiaryCasing: "rgba(158, 154, 146, 0.72)",
  roadTrunkPrimary: "rgba(192, 188, 178, 1)",
  roadMotorway: "rgba(182, 176, 164, 1)",
  roadLink: "rgba(192, 188, 178, 1)",
  roadMotorwayLink: "rgba(182, 176, 164, 1)",
  roadTrunkPrimaryCasing: "rgba(162, 156, 148, 0.82)",
  roadMotorwayCasing: "rgba(162, 156, 148, 0.82)",
} as const;

/** Prior active preset — light neutral floor, warm greige buildings (too brown/neutral):
 *  background rgb(228,226,222) · grass rgba(186,190,178,0.2) · building #c8c4bc · extrusion #d0ccc4
 */
export const campusGreige = {
  background: "rgb(228, 226, 222)",
  grassFill: "rgba(186, 190, 178, 1)",
  grassOpacity: 0.2,
  parkFill: "#e0deda",
  parkOutline: "rgba(168, 162, 154, 0.5)",
  parkOutlineLine: "#d4d2ce",
  woodFill: "rgba(168, 162, 154, 0.32)",
  woodOpacity: 0.3,
  waterFill: "rgba(118, 148, 168, 1)",
  waterOutline: "rgba(88, 112, 130, 0.55)",
  waterwayLine: "#7898ac",
  schoolFill: "rgb(226, 224, 220)",
  pitchFill: "rgba(214, 212, 206, 1)",
  landuseTrack: "#dad8d4",
  buildingFill: "#c8c4bc",
  buildingOutline: "#a8a29a",
  buildingExtrusion: "#d0ccc4",
  buildingExtrusionOpacity: 0.94,
  labelText: "#444444",
  labelHaloColor: "rgba(255, 255, 255, 0.92)",
  labelHaloWidth: 1.4,
  roadMinor: "hsl(40, 4%, 86%)",
  roadService: "hsl(40, 4%, 86%)",
  roadPathPedestrian: "rgba(168, 162, 154, 0.72)",
  roadSecondaryTertiary: "rgba(186, 182, 174, 1)",
  roadMinorCasing: "rgba(160, 156, 148, 0.85)",
  roadSecondaryTertiaryCasing: "rgba(148, 144, 136, 0.75)",
  roadTrunkPrimary: "rgba(196, 190, 178, 1)",
  roadMotorway: "rgba(188, 180, 166, 1)",
  roadLink: "rgba(196, 190, 178, 1)",
  roadMotorwayLink: "rgba(188, 180, 166, 1)",
  roadTrunkPrimaryCasing: "rgba(158, 148, 132, 0.85)",
  roadMotorwayCasing: "rgba(158, 148, 132, 0.85)",
} as const;

/** Active preset — uplbRefreshing: green campus, fresh campus stone buildings.
 *  background #EEF4EC · grass #7CB87A @ 0.38 · park #8FBF8A · wood forest rgba(62,96,58,0.48)
 *  water #6BA3B8 · building #E8E4DC · extrusion #D8D4CC · outline #B8B4AC · roads #C5C5C0
 */
export const uplbRefreshing = {
  background: "rgb(238, 244, 236)",
  grassFill: "rgba(124, 184, 122, 1)",
  grassOpacity: 0.38,
  parkFill: "#8fbf8a",
  parkOutline: "rgba(100, 142, 98, 0.4)",
  parkOutlineLine: "#a8c8a4",
  woodFill: "rgba(62, 96, 58, 0.48)",
  woodOpacity: 0.42,
  waterFill: "rgba(107, 163, 184, 1)",
  waterOutline: "rgba(80, 130, 150, 0.45)",
  waterwayLine: "#6ba3b8",
  schoolFill: "rgb(240, 245, 238)",
  pitchFill: "rgba(143, 191, 138, 0.85)",
  landuseTrack: "#b8c8b4",
  buildingFill: "#e8e4dc",
  buildingOutline: "#b8b4ac",
  buildingExtrusion: "#d8d4cc",
  buildingExtrusionOpacity: 0.95,
  labelText: "#444444",
  labelHaloColor: "rgba(255, 255, 255, 0.92)",
  labelHaloWidth: 1.4,
  roadMinor: "#c5c5c0",
  roadService: "#c5c5c0",
  roadPathPedestrian: "rgba(197, 197, 192, 0.72)",
  roadSecondaryTertiary: "rgba(197, 197, 192, 1)",
  roadMinorCasing: "rgba(176, 176, 170, 0.75)",
  roadSecondaryTertiaryCasing: "rgba(168, 168, 162, 0.68)",
  roadTrunkPrimary: "rgba(197, 197, 192, 1)",
  roadMotorway: "rgba(188, 188, 182, 1)",
  roadLink: "rgba(197, 197, 192, 1)",
  roadMotorwayLink: "rgba(188, 188, 182, 1)",
  roadTrunkPrimaryCasing: "rgba(160, 160, 154, 0.72)",
  roadMotorwayCasing: "rgba(160, 160, 154, 0.72)",
} as const;

export const MAP_BASEMAP_PALETTE = uplbRefreshing;

/** Toggle size-driven building colors (render_height → campus stone ramp). */
export const MAP_BASEMAP_BUILDING_SIZE_COLORS = true;

/**
 * Data-driven building color by OpenMapTiles `render_height` (meters).
 * OMT derives this from OSM height, building:levels × 3.66, or defaults to 5 m.
 * At z13 generalized blocks omit render_height — coalesce falls back to 5 (light cream).
 * Probed UPLB z14 tiles (Jun 2026): ~90 footprints, heights 1–85 m, ~10% at default 5 m.
 * Smaller footprints read lighter cream; taller blocks read grey-limestone on green lawn.
 */
export function buildingSizeColorExpression(
  palette: Pick<
    typeof uplbRefreshing,
    "buildingFill" | "buildingExtrusion"
  > = MAP_BASEMAP_PALETTE,
): ExpressionSpecification {
  return [
    "interpolate",
    ["linear"],
    ["coalesce", ["get", "render_height"], 5],
    3,
    "#ede9e1",
    5,
    "#e8e4dc",
    8,
    palette.buildingFill,
    12,
    "#e2ded6",
    18,
    palette.buildingExtrusion,
    28,
    "#c8c4bc",
    45,
    "#a8a49c",
  ];
}

type BasemapPaintValue = string | number | boolean | ExpressionSpecification;

/** Layer paint overrides keyed by MapLibre layer id. */
export const BASEMAP_LAYER_PAINT: Record<
  string,
  Record<string, BasemapPaintValue>
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
  park_outline: {
    "line-color": MAP_BASEMAP_PALETTE.parkOutlineLine,
  },
  landcover_wood: {
    "fill-color": MAP_BASEMAP_PALETTE.woodFill,
    "fill-opacity": MAP_BASEMAP_PALETTE.woodOpacity,
  },
  water: {
    "fill-color": MAP_BASEMAP_PALETTE.waterFill,
    "fill-outline-color": MAP_BASEMAP_PALETTE.waterOutline,
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
  landuse_track: {
    "fill-color": MAP_BASEMAP_PALETTE.landuseTrack,
  },
  building: {
    "fill-color": MAP_BASEMAP_BUILDING_SIZE_COLORS
      ? buildingSizeColorExpression()
      : MAP_BASEMAP_PALETTE.buildingFill,
    "fill-outline-color": MAP_BASEMAP_PALETTE.buildingOutline,
  },
  "building-3d": {
    "fill-extrusion-color": MAP_BASEMAP_BUILDING_SIZE_COLORS
      ? buildingSizeColorExpression()
      : MAP_BASEMAP_PALETTE.buildingExtrusion,
    "fill-extrusion-opacity": MAP_BASEMAP_PALETTE.buildingExtrusionOpacity,
    "fill-extrusion-vertical-gradient": true,
  },
  poi_z16: {
    "text-color": MAP_BASEMAP_PALETTE.labelText,
    "text-halo-color": MAP_BASEMAP_PALETTE.labelHaloColor,
    "text-halo-width": MAP_BASEMAP_PALETTE.labelHaloWidth,
  },
  poi_z15: {
    "text-color": MAP_BASEMAP_PALETTE.labelText,
    "text-halo-color": MAP_BASEMAP_PALETTE.labelHaloColor,
    "text-halo-width": MAP_BASEMAP_PALETTE.labelHaloWidth,
  },
  poi_z14: {
    "text-color": MAP_BASEMAP_PALETTE.labelText,
    "text-halo-color": MAP_BASEMAP_PALETTE.labelHaloColor,
    "text-halo-width": MAP_BASEMAP_PALETTE.labelHaloWidth,
  },
  poi_transit: {
    "text-color": MAP_BASEMAP_PALETTE.labelText,
    "text-halo-color": MAP_BASEMAP_PALETTE.labelHaloColor,
    "text-halo-width": MAP_BASEMAP_PALETTE.labelHaloWidth,
  },
  place_other: {
    "text-color": "#3a3a3a",
    "text-halo-color": MAP_BASEMAP_PALETTE.labelHaloColor,
    "text-halo-width": MAP_BASEMAP_PALETTE.labelHaloWidth,
  },
  water_name_line: {
    "text-halo-color": MAP_BASEMAP_PALETTE.labelHaloColor,
    "text-halo-width": MAP_BASEMAP_PALETTE.labelHaloWidth,
  },
  water_name_point: {
    "text-halo-color": MAP_BASEMAP_PALETTE.labelHaloColor,
    "text-halo-width": MAP_BASEMAP_PALETTE.labelHaloWidth,
  },
  road_minor: {
    "line-color": MAP_BASEMAP_PALETTE.roadMinor,
  },
  road_minor_casing: {
    "line-color": MAP_BASEMAP_PALETTE.roadMinorCasing,
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
  road_secondary_tertiary_casing: {
    "line-color": MAP_BASEMAP_PALETTE.roadSecondaryTertiaryCasing,
  },
  road_trunk_primary: {
    "line-color": MAP_BASEMAP_PALETTE.roadTrunkPrimary,
  },
  road_trunk_primary_casing: {
    "line-color": MAP_BASEMAP_PALETTE.roadTrunkPrimaryCasing,
  },
  road_motorway: {
    "line-color": MAP_BASEMAP_PALETTE.roadMotorway,
  },
  road_motorway_casing: {
    "line-color": MAP_BASEMAP_PALETTE.roadMotorwayCasing,
  },
  road_link: {
    "line-color": MAP_BASEMAP_PALETTE.roadLink,
  },
  road_motorway_link: {
    "line-color": MAP_BASEMAP_PALETTE.roadMotorwayLink,
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
