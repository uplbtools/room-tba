/**
 * Experimental basemap palette — Jun 2026.
 *
 * Cool neutral OSM Liberty overrides for campus viewing. Applied at runtime via
 * applyBasemapPalette() and mirrored in public/liberty-customized.json for offline
 * tiles. Pin/label colors are unchanged; dark pins stay readable on the muted
 * ground plane.
 *
 * Swap MAP_BASEMAP_PALETTE with a preset below to try alternates.
 */

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

/** Rejected Jun 2026 — cool paper mislabeled; superseded by hierarchy pass below. */
// export const MAP_BASEMAP_PALETTE = { ... } as const; // cool-paper-rejected

/** Rejected Jun 2026 — UPLB fresh buildings lighter than terrain (no hierarchy):
 *  background rgb(232,237,230) · building #e2ddd4 · extrusion #d4cec4 · park #a8b89c
 */
// export const MAP_BASEMAP_PALETTE = { ... } as const; // uplb-fresh-rejected

/** Active preset: cool paper — light receding ground, darker advancing buildings. */
export const MAP_BASEMAP_PALETTE = {
  background: "rgb(236, 238, 240)",
  grassFill: "rgba(200, 208, 200, 1)",
  grassOpacity: 0.18,
  parkFill: "#e4e6e4",
  parkOutline: "rgba(130, 132, 128, 0.5)",
  parkOutlineLine: "#d4d6d4",
  woodFill: "rgba(168, 170, 166, 0.34)",
  woodOpacity: 0.28,
  waterFill: "rgba(118, 148, 168, 1)",
  waterOutline: "rgba(88, 112, 130, 0.55)",
  waterwayLine: "#7898ac",
  schoolFill: "rgb(228, 230, 232)",
  pitchFill: "rgba(216, 218, 214, 1)",
  landuseTrack: "#dcdedc",
  buildingFill: "#a8adb2",
  buildingOutline: "hsl(220, 10%, 30%)",
  buildingExtrusion: "#94999e",
  buildingExtrusionOpacity: 0.96,
  labelText: "#444444",
  labelHaloColor: "rgba(255, 255, 255, 0.92)",
  labelHaloWidth: 1.4,
  roadMinor: "hsl(220, 4%, 86%)",
  roadService: "hsl(220, 4%, 86%)",
  roadPathPedestrian: "rgba(168, 170, 166, 0.72)",
  roadSecondaryTertiary: "rgba(178, 180, 176, 1)",
  roadMinorCasing: "rgba(160, 162, 158, 0.85)",
  roadSecondaryTertiaryCasing: "rgba(148, 150, 146, 0.75)",
  roadTrunkPrimary: "rgba(188, 186, 178, 1)",
  roadMotorway: "rgba(178, 174, 164, 1)",
  roadLink: "rgba(188, 186, 178, 1)",
  roadMotorwayLink: "rgba(178, 174, 164, 1)",
  roadTrunkPrimaryCasing: "rgba(158, 154, 146, 0.85)",
  roadMotorwayCasing: "rgba(158, 154, 146, 0.85)",
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
    "fill-color": MAP_BASEMAP_PALETTE.buildingFill,
    "fill-outline-color": MAP_BASEMAP_PALETTE.buildingOutline,
  },
  "building-3d": {
    "fill-extrusion-color": MAP_BASEMAP_PALETTE.buildingExtrusion,
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
