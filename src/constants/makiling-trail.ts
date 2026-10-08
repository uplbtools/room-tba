/**
 * Mt. Makiling UPLB trail (#716): the stations and landmarks hikers name,
 * from Station 1 (trailhead) beside MCME to Peak 2.
 *
 * Positions are the OpenStreetMap route-marker nodes for each station
 * ((c) OpenStreetMap contributors, ODbL 1.0); each sits on the traced line in
 * makiling-trail-path.ts. Distances and elevations are not stored here:
 * lib/makiling-trail.ts measures them along that line, so they cannot drift
 * from the geometry. Stations without an OSM marker (12, 14, 15, 20, 23, 24,
 * 26, 28) are left out rather than guessed.
 *
 * Rules (cut-off, gate, permits) come from MCME guidance as published for
 * the trail; they change, so the panel tells hikers to confirm with MCME.
 */

export type TrailStop = {
  /** Stable id for URLs (?trail=agila-base) and list keys. */
  id: string;
  /** Station number on the trail markers; null for named spots between them. */
  station: number | null;
  name: string;
  /** What a hiker needs to know here. Omitted for plain markers. */
  description?: string;
  lon: number;
  lat: number;
  /** OSM node the position comes from. */
  osmNode: number;
  /** Directory place at this stop (opens its place sheet). */
  placeName?: string;
  /** Directory place reached by a side trail from this stop. */
  sideTripPlaceName?: string;
  /** Extra words search should match ("jump-off", "summit"). */
  aliases?: readonly string[];
};

export const MAKILING_TRAIL_NAME = "Makiling Trail";
export const MAKILING_TRAIL_SUBTITLE = "UPLB trail to Peak 2";

/** Directory pins the trail starts and ends at. */
export const MAKILING_TRAILHEAD_PLACE =
  "Maria Makiling Trail Station 1 (trailhead)";
export const MAKILING_PEAK_2_PLACE = "Mount Makiling Peak 2";

export const MAKILING_TRAIL_STOPS: readonly TrailStop[] = [
  {
    id: "station-1",
    station: 1,
    name: "Station 1 (trailhead)",
    description:
      "Jump-off beside the Makiling Center for Mountain Ecosystems (MCME) on Makiling Road. Register at the MCME registration area here and meet your guide before you start. The gate opens at 06:00.",
    lon: 121.233701,
    lat: 14.15132,
    osmNode: 606531743,
    placeName: MAKILING_TRAILHEAD_PLACE,
    aliases: ["Trailhead", "Jump-off", "Registration", "MCME"],
  },
  {
    id: "station-2",
    station: 2,
    name: "Flat Rocks turn-off",
    description:
      "A short side trail drops to Flat Rocks on Molawin Creek, a popular rest stop.",
    lon: 121.2318266,
    lat: 14.1480594,
    osmNode: 945030737,
    sideTripPlaceName: "Flat Rocks",
    aliases: ["Flat Rocks"],
  },
  {
    id: "station-3",
    station: 3,
    name: "Station 3",
    lon: 121.22992,
    lat: 14.1464324,
    osmNode: 638551946,
  },
  {
    id: "station-4",
    station: 4,
    name: "Station 4",
    lon: 121.2321807,
    lat: 14.143742,
    osmNode: 945030676,
  },
  {
    id: "station-5",
    station: 5,
    name: "Station 5",
    lon: 121.2317408,
    lat: 14.1386546,
    osmNode: 945030692,
  },
  {
    id: "station-6",
    station: 6,
    name: "Station 6",
    lon: 121.2304748,
    lat: 14.137094,
    osmNode: 945030707,
  },
  {
    id: "station-7",
    station: 7,
    name: "Station 7",
    lon: 121.2282217,
    lat: 14.1353669,
    osmNode: 945030753,
  },
  {
    id: "station-8",
    station: 8,
    name: "Mud Springs turn-off",
    description:
      "Side trail to Mud Springs, a bubbling geothermal mud pool. The ground near the pool is hot and soft; stay on the path.",
    lon: 121.2255395,
    lat: 14.1357831,
    osmNode: 945030755,
    sideTripPlaceName: "Mud Springs",
    aliases: ["Mud Springs", "Mudspring"],
  },
  {
    id: "station-9",
    station: 9,
    name: "Station 9",
    lon: 121.224038,
    lat: 14.133784,
    osmNode: 638552200,
  },
  {
    id: "station-10",
    station: 10,
    name: "Station 10",
    lon: 121.2159833,
    lat: 14.1308448,
    osmNode: 638552264,
  },
  {
    id: "agila-base",
    station: 11,
    name: "Agila Base",
    description:
      "End of the paved trail and the last reliable water. Day hikers must reach Agila Base by 09:00 (cut-off) or turn back. Habal-habal (motorcycle taxis) drop off here.",
    lon: 121.2099966,
    lat: 14.1290501,
    osmNode: 638552300,
    aliases: ["Agila"],
  },
  {
    id: "punodaan",
    station: null,
    name: "Punodaan",
    lon: 121.2079161,
    lat: 14.1337538,
    osmNode: 643328894,
  },
  {
    id: "station-13",
    station: 13,
    name: "Station 13",
    lon: 121.2060063,
    lat: 14.1363184,
    osmNode: 643328926,
  },
  {
    id: "malaboo",
    station: null,
    name: "Malaboo",
    description:
      "Campsite. The wilderness zone starts here: leeches (limatik) are common from Malaboo to the summit.",
    lon: 121.2058029,
    lat: 14.1367451,
    osmNode: 2764005749,
    aliases: ["Malaboo campsite", "Wilderness zone"],
  },
  {
    id: "station-16",
    station: 16,
    name: "Station 16",
    description:
      "Dense rainforest from here on; the trail narrows and steepens.",
    lon: 121.2045384,
    lat: 14.1387947,
    osmNode: 2764005756,
  },
  {
    id: "station-17",
    station: 17,
    name: "Station 17",
    lon: 121.2017925,
    lat: 14.1369153,
    osmNode: 2764005760,
  },
  {
    id: "station-18",
    station: 18,
    name: "Station 18",
    lon: 121.2010239,
    lat: 14.1369037,
    osmNode: 2764005763,
  },
  {
    id: "station-19",
    station: 19,
    name: "Station 19",
    lon: 121.2001752,
    lat: 14.1389142,
    osmNode: 643329009,
  },
  {
    id: "assault-start",
    station: null,
    name: "Start of the final ascent",
    description:
      "The steep last climb to Peak 2 begins: roots, mud and rope sections. Allow extra time when wet.",
    lon: 121.1990433,
    lat: 14.1393563,
    osmNode: 643329024,
    aliases: ["Assault"],
  },
  {
    id: "station-21",
    station: 21,
    name: "Viewpoint (Station 21)",
    description: "Partial views of Laguna de Bay when clear; often fogged in.",
    lon: 121.1988728,
    lat: 14.1388782,
    osmNode: 2764005767,
    aliases: ["Viewpoint"],
  },
  {
    id: "station-22",
    station: 22,
    name: "Station 22",
    lon: 121.1978611,
    lat: 14.1382127,
    osmNode: 643329034,
  },
  {
    id: "station-25",
    station: 25,
    name: "Station 25",
    lon: 121.1964136,
    lat: 14.1369485,
    osmNode: 2764005772,
  },
  {
    id: "station-27",
    station: 27,
    name: "Station 27",
    lon: 121.1953391,
    lat: 14.1359229,
    osmNode: 2764005774,
  },
  {
    id: "station-29",
    station: 29,
    name: "Station 29",
    lon: 121.1940544,
    lat: 14.1358502,
    osmNode: 643329080,
  },
  {
    id: "peak-2",
    station: null,
    name: "Peak 2 (summit)",
    description:
      "End of the UPLB trail. A small summit clearing; Laguna de Bay and Mt. Banahaw show when the clouds lift. Head down early enough to reach Station 1 before dark.",
    lon: 121.193905,
    lat: 14.135847,
    osmNode: 332020189,
    placeName: MAKILING_PEAK_2_PLACE,
    aliases: ["Peak 2", "Summit", "Makiling summit"],
  },
];

/** Hiker briefing shown once in the trail panel ("Before you go"). */
export const MAKILING_TRAIL_BEFORE_YOU_GO: readonly {
  title: string;
  body: string;
}[] = [
  {
    title: "Register at Station 1",
    body: "Sign in at the MCME registration area at Station 1 (trailhead), beside MCME on Makiling Road, before you start.",
  },
  {
    title: "Permit and guide",
    body: "Hikes to Peak 2 need an MCME permit and an accredited guide. Arrange both with MCME before your hike day.",
  },
  {
    title: "Gate and cut-off",
    body: "The gate at Station 1 opens at 06:00. Day hikers must reach Agila Base (Station 11) by 09:00 or turn back.",
  },
  {
    title: "Water and leeches",
    body: "Agila Base is the last reliable water. Leeches (limatik) are common in the wilderness zone, from Malaboo to the summit.",
  },
];

/** Trail color: forest green, matching the Forestry jeepney route family. */
export const MAKILING_TRAIL_COLOR = "#15803d";

/** MapLibre source/layer IDs. */
export const MAKILING_TRAIL_SOURCE_ID = "makiling-trail-line";
export const MAKILING_TRAIL_LAYER_ID = "makiling-trail-line";
export const MAKILING_TRAIL_LAYER_CASING_ID = "makiling-trail-line-casing";
export const MAKILING_TRAIL_STATIONS_SOURCE_ID = "makiling-trail-stations";
export const MAKILING_TRAIL_STATIONS_LAYER_ID = "makiling-trail-stations";
export const MAKILING_TRAIL_STATION_LABELS_LAYER_ID =
  "makiling-trail-station-labels";
export const MAKILING_TRAIL_SELECTED_LAYER_ID =
  "makiling-trail-station-selected";
