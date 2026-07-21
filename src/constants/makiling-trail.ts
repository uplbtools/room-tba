/**
 * Mt. Makiling UPLB Trail — station data and trail geometry (#716 trail feature).
 *
 * The UPLB trail runs from the College of Forestry and Natural Resources (CFNR)
 * to Peak 2 (1,090 MASL), spanning 30 stations. This constant captures the
 * major named landmarks along the trail with approximate GPS coordinates.
 *
 * Coordinates are approximate, derived from the trail path visible on
 * satellite imagery and AllTrails/hiking blog references. They are accurate
 * enough for a map overlay but should not be used for navigation.
 *
 * Source: UPLB Makiling Center for Mountain Ecosystems (MCME), AllTrails,
 * and published hiking guides. Last verified: 2026-07-20.
 */

export type TrailStation = {
  /** Station number (1–30). Some are grouped into named landmarks. */
  station: number;
  name: string;
  description: string;
  /** Approximate elevation in meters above sea level. */
  elevationMeters: number;
  lon: number;
  lat: number;
};

export const MAKILING_TRAIL_STATIONS: TrailStation[] = [
  {
    station: 1,
    name: "Jump-off / CFNR",
    description:
      "College of Forestry and Natural Resources. Registration and guide briefing point. Gate opens 06:00.",
    elevationMeters: 40,
    lon: 121.235,
    lat: 14.15,
  },
  {
    station: 2,
    name: "Flatrocks junction",
    description:
      "Side trip to Flatrocks — large flat boulders along the river, ~30 min detour downstream.",
    elevationMeters: 80,
    lon: 121.2335,
    lat: 14.148,
  },
  {
    station: 7,
    name: "Tayabak Campsite",
    description: "First campsite along the trail. Flat ground near the river.",
    elevationMeters: 220,
    lon: 121.2315,
    lat: 14.145,
  },
  {
    station: 8,
    name: "Mud Spring junction",
    description:
      "Side trip to Mud Spring — sulfuric fumes and boiling mud. Geothermal feature.",
    elevationMeters: 280,
    lon: 121.2308,
    lat: 14.1438,
  },
  {
    station: 11,
    name: "Agila Base",
    description:
      "Last reliable water source. Strict 09:00 cut-off for day hikers. Habal-habal drop-off point.",
    elevationMeters: 450,
    lon: 121.2295,
    lat: 14.141,
  },
  {
    station: 14,
    name: "Malaboo Campsite",
    description:
      "Main campsite. Wilderness zone begins here — leeches (limatik) common.",
    elevationMeters: 620,
    lon: 121.2285,
    lat: 14.1375,
  },
  {
    station: 16,
    name: "Wilderness Zone start",
    description:
      "Trail steepens. Dense rainforest, rope assists, heavy leech presence above 600 MASL.",
    elevationMeters: 720,
    lon: 121.228,
    lat: 14.1355,
  },
  {
    station: 21,
    name: "Viewpoint",
    description: "Partial views of Laguna de Bay when clear. Often fogged in.",
    elevationMeters: 880,
    lon: 121.227,
    lat: 14.133,
  },
  {
    station: 26,
    name: "Peak 1 junction",
    description:
      "Trail forks — left to Peak 1, right continues to Peak 2 (summit).",
    elevationMeters: 1000,
    lon: 121.2262,
    lat: 14.1305,
  },
  {
    station: 30,
    name: "Peak 2 (Summit)",
    description:
      "Summit of Mt. Makiling, 1,090 MASL. Small viewing deck — Laguna de Bay and Mt. Banahaw visible when clear.",
    elevationMeters: 1090,
    lon: 121.2255,
    lat: 14.129,
  },
];

/** Trail line geometry — connects stations in order. */
export const MAKILING_TRAIL_LINE: [number, number][] =
  MAKILING_TRAIL_STATIONS.map((s) => [s.lon, s.lat]);

/** Trail color — forest green, matching the Forestry jeepney route family. */
export const MAKILING_TRAIL_COLOR = "#15803d";

/** MapLibre source/layer IDs. */
export const MAKILING_TRAIL_SOURCE_ID = "makiling-trail-line";
export const MAKILING_TRAIL_LAYER_ID = "makiling-trail-line";
export const MAKILING_TRAIL_LAYER_CASING_ID = "makiling-trail-line-casing";
export const MAKILING_TRAIL_STATIONS_SOURCE_ID = "makiling-trail-stations";
export const MAKILING_TRAIL_STATIONS_LAYER_ID = "makiling-trail-stations";

/** Camera view that frames the full trail. */
export const MAKILING_TRAIL_CAMERA = {
  center: [121.2295, 14.14] as [number, number],
  zoom: 13.5,
  pitch: 55,
  bearing: 200,
};
