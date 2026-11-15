/**
 * Mt. Makiling trails (#716): the stations and landmarks hikers name on the
 * UPLB trail, from Station 1 (trailhead) beside MCME to Peak 2, and on the
 * Sipit Trail, from the Sto. Tomas, Batangas side to Peak 2.
 *
 * Positions are the OpenStreetMap route-marker nodes for each station
 * ((c) OpenStreetMap contributors, ODbL 1.0); each sits on the traced line in
 * makiling-trail-path.ts. Distances and elevations are not stored here:
 * lib/makiling-trail.ts measures them along that line, so they cannot drift
 * from the geometry. Stations without an OSM marker (12, 14, 15, 20, 23, 24,
 * 26, 28) are left out rather than guessed.
 *
 * The UPLB trail's rules come from MCME's access protocol (updated
 * 2026-09-22). The Sipit Trail's status comes from MCME's joint trail
 * assessment (2026-01-24) and its hiking notes from older guides. Rules
 * change, so the panel tells hikers to confirm with MCME.
 */

import { MAKILING_TRAIL_PATH, SIPIT_TRAIL_PATH } from "./makiling-trail-path";

export type TrailStop = {
  /** Stable id for URLs (?trail=agila-base) and list keys, unique across trails. */
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

/** Directory pins the trail starts and ends at. */
export const MAKILING_TRAILHEAD_PLACE =
  "Maria Makiling Trail Station 1 (trailhead)";
export const MAKILING_PEAK_2_PLACE = "Mount Makiling Peak 2";

const PEAK_2 = { lon: 121.193905, lat: 14.135847, osmNode: 332020189 };

export const MAKILING_TRAIL_STOPS: readonly TrailStop[] = [
  {
    id: "station-1",
    station: 1,
    name: "Station 1 (trailhead)",
    description:
      "This is the jump-off, beside the Makiling Center for Mountain Ecosystems (MCME) on Makiling Road. Register here, leave one valid ID and attend the briefing before you start. The trail opens at 6 AM.",
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
      "This side trail goes to Mud Springs, a bubbling geothermal mud pool. The ground near the pool is hot and soft, so stay on the path.",
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
      "The paved trail ends here, and this is the last reliable water. Habal-habal (motorcycle taxis) drop off here.",
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
      "This is a campsite. The wilderness zone starts here, and leeches (limatik) are common from Malaboo to the summit.",
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
      "The rainforest is dense from here on, and the trail narrows and steepens.",
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
      "The steep last climb to Peak 2 begins, with roots, mud and rope sections. Allow extra time when wet.",
    lon: 121.1990433,
    lat: 14.1393563,
    osmNode: 643329024,
    aliases: ["Assault"],
  },
  {
    id: "station-21",
    station: 21,
    name: "Viewpoint (Station 21)",
    description:
      "You get partial views of Laguna de Bay when it's clear, but it's often fogged in.",
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
      "This is the end of the UPLB trail, a small summit clearing. Laguna de Bay and Mt. Banahaw show when the clouds lift. Head down early enough to log out at Station 1 by 4 PM.",
    ...PEAK_2,
    placeName: MAKILING_PEAK_2_PLACE,
    aliases: ["Peak 2", "Summit", "Makiling summit"],
  },
];

const UPLB_BEFORE_YOU_GO = [
  {
    title: "Register and briefing",
    body: "Register online or at Monitoring Station 1 (College of Forestry) and attend the briefing. Leave one valid ID at Station 1. It's returned when your whole group logs out.",
  },
  {
    title: "Hours",
    body: "The trail is open from 6 AM to 2 PM. The cut-off to start for Peak 2 is 9 AM, and everyone logs out at Station 1 by 4 PM.",
  },
  {
    title: "Fees and permits",
    body: "The entrance fee is PHP 10 per person. Camping is PHP 500 per group per night, and campers need a permit. Groups and organizers need a written MCME permit.",
  },
  {
    title: "Not allowed",
    body: "Liquor, drugs, weapons, portable speakers and pets aren't allowed, and bags are checked. Peak 3 isn't open from Station 1. Stormy weather suspends all activity.",
  },
  {
    title: "Contact",
    body: "Call Station 1 at 0908 988 1778 or email mcme.uplb@up.edu.ph.",
  },
  {
    title: "Water and leeches",
    body: "Agila Base is the last reliable water. Leeches (limatik) are common in the wilderness zone, from Malaboo to the summit.",
  },
] as const;

const SIPIT_BEFORE_YOU_GO = [
  {
    title: "Guide",
    body: "Older guides (Pinoy Mountaineer, 2015) say a guide is mandatory. Ask MCME what applies once the trail opens.",
  },
  {
    title: "Time and route",
    body: "The same guides give 5 to 8 hours from the trailhead to Peak 2. They describe the traverse going down to UPLB along the UPLB trail.",
  },
  {
    title: "Hazards",
    body: "Older guides mention leeches, steep sections with ropes and landslides. Conditions may have changed since then.",
  },
] as const;

export type MakilingTrail = {
  /** Also the ?trail= value for the trail's overview (the UPLB trail uses "overview"). */
  id: string;
  name: string;
  /** Short name for the trail picker. */
  label: string;
  subtitle: string;
  /** Where distances are measured from ("Station 1"). */
  startLabel: string;
  path: readonly (readonly [number, number, number])[];
  stops: readonly TrailStop[];
  /** Extra words search should match for the whole trail. */
  aliases: readonly string[];
  beforeYouGo: readonly { title: string; body: string }[];
  /** Where the "Before you go" facts come from. */
  source: { text: string; label: string; href: string };
  /** Hiked to Peak 2 once, not out and back. */
  oneWay?: boolean;
  /** Time from the guides, when Naismith's rule would mislead. */
  estTime?: string;
  /** Shown above the details while the trail is closed to visitors. */
  closed?: { text: string; label: string; href: string };
};

export const MAKILING_TRAIL_ID = "uplb";
export const SIPIT_TRAIL_ID = "sipit";

export const SIPIT_TRAIL_STOPS: readonly TrailStop[] = [
  {
    id: "sipit-trailhead",
    station: null,
    name: "Sipit trailhead",
    description:
      "This is the jump-off on the Sto. Tomas, Batangas side, in Brgy. San Miguel.",
    lon: 121.1882616,
    lat: 14.106425,
    osmNode: 2921523376,
    aliases: ["Sipit trailhead", "Sto. Tomas", "San Miguel", "Batangas"],
  },
  {
    id: "sipit-junction",
    station: null,
    name: "Junction with the old Makiling Trail",
    description:
      "The Sipit Trail meets a trail that OpenStreetMap names Makiling Trail here, and it carries on to Peak 2.",
    lon: 121.1827717,
    lat: 14.1210274,
    osmNode: 2921524188,
    aliases: ["Junction"],
  },
  {
    id: "sipit-peak-2",
    station: null,
    name: "Peak 2 (Sipit Trail)",
    description:
      "This is the end of the Sipit Trail at Peak 2. Older guides say the traverse goes on down to UPLB along the UPLB trail.",
    ...PEAK_2,
  },
];

const MCME_FACEBOOK = "https://www.facebook.com/makilingcenter";

export const MAKILING_TRAILS: readonly MakilingTrail[] = [
  {
    id: MAKILING_TRAIL_ID,
    name: "Makiling Trail",
    label: "UPLB trail",
    subtitle: "UPLB trail to Peak 2",
    startLabel: "Station 1",
    path: MAKILING_TRAIL_PATH,
    stops: MAKILING_TRAIL_STOPS,
    aliases: [
      "Makiling Trail",
      "Trail",
      "Mt. Makiling trail",
      "Mount Makiling trail",
      "UPLB trail",
      "Peak 2 trail",
      "Hiking trail",
    ],
    beforeYouGo: UPLB_BEFORE_YOU_GO,
    source: {
      text: "Rules and hours are from",
      label: "MCME's access protocol (updated September 22, 2026)",
      href: "https://makiling.center/please-be-guided-access-protocol-along-the-mariang-makiling-trail-mmt/",
    },
  },
  {
    id: SIPIT_TRAIL_ID,
    name: "Sipit Trail",
    label: "Sipit trail",
    subtitle: "Sto. Tomas, Batangas side to Peak 2",
    startLabel: "the trailhead",
    path: SIPIT_TRAIL_PATH,
    stops: SIPIT_TRAIL_STOPS,
    aliases: [
      "Sipit Trail",
      "Mount Makiling Sipit Trail",
      "Makiling traverse",
      "Sto. Tomas trail",
    ],
    beforeYouGo: SIPIT_BEFORE_YOU_GO,
    source: {
      text: "The status is from",
      label: "MCME's joint trail assessment (January 24, 2026)",
      href: "https://makiling.center/joint-trail-assessment-at-mount-makiling-forest-reserve-in-preparation-for-the-make-it-makiling-2026/",
    },
    oneWay: true,
    estTime: "5 to 8 h",
    closed: {
      text: "The Sipit Trail isn't open to visitors yet. MCME assessed the traverse with partners on January 24, 2026 and said it isn't ready for hikers.",
      label: "facebook.com/makilingcenter",
      href: MCME_FACEBOOK,
    },
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
