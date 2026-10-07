// src/constants/jeepney-routes.ts

import type { LineString } from "geojson";

export type JeepneyStop = {
  /** Database id; absent only in the bundled offline fallback. */
  id?: number;
  name: string;
  description: string;
  lat: number;
  lon: number;
  sortOrder?: number;
  version?: number;
  updatedAt?: string;
};

export type JeepneyFare = {
  /** Cash fare in PHP. */
  regular: number;
  /** Student / senior / PWD fare in PHP. */
  discounted: number;
};

export type JeepneyRoute = {
  id: string;
  name: string;
  description: string;
  /** How to read the stop order, e.g. Kaliwa vs Kanan running the loop in
   * opposite directions. Shown prominently in the route modal. */
  directionNote?: string;
  color: string;
  fare: JeepneyFare;
  stops: JeepneyStop[];
};

/**
 * The day the maintainer last confirmed fares. Only prices confirmed then
 * are quoted; everything else says so instead of guessing.
 */
export const FARES_VERIFIED_ON = "October 7, 2026";
export const FARES_VERIFIED_NOTE = `Prices verified as of ${FARES_VERIFIED_ON}.`;

/** Campus jeepney fares are set campus-wide, not per route. */
export const JEEPNEY_FARE_NOTE = `${FARES_VERIFIED_NOTE} Pay the driver as you ride.`;

/**
 * Town jeeps charge by distance: the minimum fare, plus a per-kilometre
 * amount from the LTFRB fare matrix.
 */
export const TOWN_JEEPNEY_MINIMUM_FARE: JeepneyFare = {
  regular: 14,
  discounted: 12,
};

/** Whole-route fares the maintainer has confirmed, by route id. */
export const VERIFIED_END_TO_END_FARES: Readonly<Record<string, JeepneyFare>> =
  {
    "lb-to-calamba": { regular: 30, discounted: 25 },
  };

const STANDARD_CAMPUS_FARE: JeepneyFare = { regular: 14, discounted: 12 };

/** Routes sold as advance tickets instead of cash on board. */
export type RouteTicketing = { operator: string; url: string };

const DLTB_TICKETING: RouteTicketing = {
  operator: "DLTB",
  url: "https://dltbbus.com.ph/",
};

/**
 * The UPLB <-> UP Diliman bus is booked on DLTB's website, which also has the
 * current fare, so the app links there instead of quoting a price.
 */
const ROUTE_TICKETING: Readonly<Record<string, RouteTicketing>> = {
  "uplb-to-upd": DLTB_TICKETING,
  "upd-to-uplb": DLTB_TICKETING,
};

/**
 * Where to board, for routes that only pass Los Baños. Shown above the stop
 * list; kept in code so it does not wait on a database edit.
 */
const JUNCTION_BOARDING_NOTE =
  "Comes from Calamba and does not enter the UPLB campus. Board at the Junction on the national highway by Olivarez Plaza; from campus, ride a Kaliwa or Kanan jeep there first.";

export const ROUTE_BOARDING_NOTES: Readonly<Record<string, string>> = {
  "lb-to-san-pablo": JUNCTION_BOARDING_NOTE,
  "lb-to-sta-cruz": JUNCTION_BOARDING_NOTE,
  forestry:
    "Board at a terminal. Forestry jeeps fill up at their first stop and rarely have room further along: going up, board at the Forestry Jeep Terminal; going down, at the Upper Forestry Jeep Terminal.",
};

/** The same advice, short enough for a route card on the printable map. */
export const ROUTE_PRINT_NOTES: Readonly<Record<string, string>> = {
  forestry: "Board at a terminal (bold), up or down; jeeps fill up there.",
};

/** Forestry's two trips; also written to the database by scripts/fix-transit-data.ts. */
export const FORESTRY_DIRECTION_NOTE =
  "Uphill trips start at the Forestry Jeep Terminal and serve the stops as listed. Past New FOREHA the jeep loops down Makiling Road, east along Valentin Sajor and back up Felix O. Chinte Sr. through MAREHA and FOREHA. Downhill trips start at the Upper Forestry Jeep Terminal and run back down to the Forestry Jeep Terminal, serving the same stops in reverse; going down, the jeep stays on Makiling Road instead of turning at the Admin Building.";

export function routeTicketing(routeId: string): RouteTicketing | null {
  return ROUTE_TICKETING[routeId] ?? null;
}

/**
 * Database routes plus any bundled route the database does not have yet (a
 * new route ships in code before anyone adds it to the database, and the
 * offline cache drops stops without database ids). Database rows win.
 */
export function withBundledRoutes(routes: JeepneyRoute[]): JeepneyRoute[] {
  const usable = new Set(
    routes.filter((r) => r.stops.length > 0).map((r) => r.id),
  );
  const missing = JEEPNEY_ROUTES.filter((r) => !usable.has(r.id));
  if (missing.length === 0) return routes;
  const missingIds = new Set(missing.map((r) => r.id));
  return [...routes.filter((r) => !missingIds.has(r.id)), ...missing];
}

/** Fallback route line when no road-snapped geometry exists: a straight
 * polyline through the route's stops, in GeoJSON [lon, lat] order. */
export function deriveRouteLineFromStops(
  stops: JeepneyStop[],
): LineString | null {
  if (stops.length < 2) return null;
  return {
    type: "LineString",
    coordinates: stops.map((stop) => [stop.lon, stop.lat]),
  };
}

/**
 * Where a route's drawn line came from, worst-case last. A car-routed path
 * between two bus stops is a *plausible* road path, not necessarily the one the
 * vehicle takes, and a stops-only line is not a road path at all — so the
 * distinction is shown to the rider rather than hidden in the data.
 */
export type RouteGeometrySource = "osm-relation" | "routed" | "stops-only";

/** An entry of `src/constants/jeepney-geometries.json`. */
export type StoredRouteGeometry = {
  source: Exclude<RouteGeometrySource, "stops-only">;
  /** Which relation or routing pass produced it; for maintainers, not the UI. */
  note?: string;
  /**
   * Route-specific honesty note shown instead of the generic one, for lines
   * that are sourced yet still qualified — a reversed relation, a corridor
   * trimmed at our own end points, an alignment OSM and the operator disagree
   * on. Sourced does not always mean settled.
   */
  caveat?: string;
  geometry: LineString;
};

export type ResolvedRouteGeometry = {
  source: RouteGeometrySource;
  /** Null when a route has neither stored geometry nor two stops to join. */
  line: LineString | null;
  /** What to tell the rider, or null when nothing needs qualifying. */
  caveat: string | null;
};

/** Rider-facing caveat per source; `null` where the line is sourced, not guessed. */
export const ROUTE_GEOMETRY_NOTES: Record<RouteGeometrySource, string | null> =
  {
    "osm-relation": null,
    routed:
      "This line is road-routed between the stops, not traced from the operator's published route. Expect the real trip to differ in places.",
    "stops-only":
      "The exact path of this route is not mapped yet. The dashed line just joins the stops in order — it is not the road the vehicle takes.",
  };

/**
 * Pick the best available line for a route and say where it came from.
 * Sourced geometry wins; otherwise fall back to joining the stops, which is
 * drawn as provisional rather than passed off as a road path.
 */
export function resolveRouteGeometry(
  route: Pick<JeepneyRoute, "id" | "stops">,
  geometries: Record<string, StoredRouteGeometry | undefined>,
): ResolvedRouteGeometry {
  const stored = geometries[route.id];
  if (stored?.geometry?.coordinates?.length) {
    return {
      source: stored.source,
      line: stored.geometry,
      // A route-specific caveat replaces the generic one; it is more accurate
      // about why this particular line is qualified.
      caveat: stored.caveat ?? ROUTE_GEOMETRY_NOTES[stored.source],
    };
  }
  return {
    source: "stops-only",
    line: deriveRouteLineFromStops(route.stops),
    caveat: ROUTE_GEOMETRY_NOTES["stops-only"],
  };
}

export const JEEPNEY_ROUTES: JeepneyRoute[] = [
  {
    id: "kaliwa-kanan",
    name: "Kaliwa / Kanan",
    description:
      "Loop between Olivarez Plaza in Los Baños town and the UPLB academic core, passing Raymundo Gate, the Main Library, the dormitories, and CEAT.",
    directionNote:
      "Kaliwa and Kanan are the same loop; the name says which way the jeep turns after entering the UPLB gate. Kanan follows the stops as listed (Carabao Park / DevCom first); Kaliwa serves the same stops in reverse (Carabao Park / Landbank first). Across Freedom Park a jeep may pass either the Student Union or the Dormitories; ask the driver which way it goes.",
    color: "#dc2626",
    fare: STANDARD_CAMPUS_FARE,
    stops: [
      {
        name: "Olivarez Plaza Mall",
        description:
          "Town-side terminal and common transfer point near Olivarez Plaza.",
        lat: 14.17903,
        lon: 121.23908,
      },
      {
        name: "Robinsons Town Mall",
        description: "Town-side stop beside Robinsons Los Baños.",
        lat: 14.177349211032917,
        lon: 121.24242089688644,
      },
      {
        name: "Carabao Park / DevCom",
        description:
          "Campus-core stop by Carabao Park and the College of Development Communication.",
        lat: 14.167680673655115,
        lon: 121.24302990984792,
      },
      {
        name: "Raymundo Gate",
        description:
          "Gate-side stop along Raymundo Road, linking town and campus.",
        lat: 14.16773707639881,
        lon: 121.2416075132719,
      },
      {
        name: "CAP-CSI",
        description:
          "Stop near the College of Arts and Sciences and campus service offices.",
        lat: 14.167227355646022,
        lon: 121.24044598783846,
      },
      {
        name: "Sacay",
        description:
          "Central-campus stop on the route between Raymundo Gate and the library.",
        lat: 14.166436241690047,
        lon: 121.23861696327558,
      },
      {
        name: "Main Library",
        description:
          "Stop beside the UPLB Main Library and the central academic core.",
        lat: 14.165440954550126,
        lon: 121.2386041983236,
      },
      {
        name: "Graduate School / Umali",
        description:
          "Stop serving the Graduate School and the Umali Hall area.",
        lat: 14.163742377049818,
        lon: 121.23998877527784,
      },
      {
        name: "Women's Dormitory",
        description: "Stop by the Women's Dormitory residence halls.",
        lat: 14.162362067987052,
        lon: 121.24056837513993,
      },
      {
        name: "Men's Dormitory",
        description: "Stop by the Men's Dormitory residence halls.",
        lat: 14.16091203484906,
        lon: 121.2412408051354,
      },
      {
        name: "Baker Hall",
        description: "Stop near Baker Hall and nearby student services.",
        lat: 14.161219041586817,
        lon: 121.24257006568956,
      },
      {
        name: "Animal Husbandry",
        description: "Stop serving the Animal and Dairy Sciences area.",
        lat: 14.15989413929804,
        lon: 121.24366990769977,
      },
      {
        name: "Agronomy Building",
        description: "Stop close to the Agronomy academic buildings.",
        lat: 14.160182373364517,
        lon: 121.2443733752706,
      },
      {
        name: "CEAT",
        description:
          "Stop for the College of Engineering and Agro-Industrial Technology classrooms and laboratories.",
        lat: 14.16087221013792,
        lon: 121.24495080555562,
      },
      {
        name: "Senior's Social Garden",
        description:
          "Stop beside the Senior's Social Garden in the campus core.",
        lat: 14.162690186117826,
        lon: 121.2438403651636,
      },
      {
        name: "Headquarters",
        description: "Stop near the UPLB administrative headquarters area.",
        lat: 14.16352431907233,
        lon: 121.2437220269563,
      },
      {
        name: "St. Therese / Math Building",
        description:
          "Stop near St. Therese and Mathematics classroom buildings.",
        lat: 14.165120117289403,
        lon: 121.24456008780996,
      },
      {
        name: "Makiling School",
        description:
          "Stop beside the UP Rural High School / Makiling School area.",
        lat: 14.165744564457338,
        lon: 121.24426410223518,
      },
      {
        name: "Carabao Park / Landbank",
        description: "Campus-core stop by Carabao Park and the LandBank area.",
        lat: 14.167026218728786,
        lon: 121.24373658223566,
      },
      {
        name: "Olivarez Plaza Mall",
        description:
          "Town-side terminal and common transfer point near Olivarez Plaza.",
        lat: 14.17903,
        lon: 121.23908,
      },
    ],
  },
  {
    id: "forestry",
    name: "Forestry",
    description:
      "Connects the campus core to the upper Forestry campus: from the Forestry jeep terminal past Narra Bridge, the University Health Service, and CPAf, climbing past Makiling Botanic Gardens to the College of Forestry and Natural Resources and the FOREHA, New FOREHA, and MAREHA residence halls.",
    directionNote: FORESTRY_DIRECTION_NOTE,
    color: "#d97706",
    fare: STANDARD_CAMPUS_FARE,
    stops: [
      {
        name: "Forestry Jeep Terminal",
        description: "Terminal for the uphill route to the Forestry campus.",
        lat: 14.16809105957495,
        lon: 121.24248142545251,
      },
      {
        name: "CEM Jeepney Stop",
        description:
          "Stop serving the College of Economics and Management area.",
        lat: 14.167744858385788,
        lon: 121.24160128212628,
      },
      {
        name: "OVCRE Annex Building",
        description:
          "Stop near the Office of the Vice Chancellor for Research and Extension annex.",
        lat: 14.167161010311109,
        lon: 121.24043389915563,
      },
      {
        name: "Narra Bridge",
        description: "Stop by Narra Bridge on the approach to upper campus.",
        lat: 14.164723828661357,
        lon: 121.23847671766336,
      },
      {
        name: "Maria Makiling Statue",
        description:
          "Stop beside the Maria Makiling statue along the Forestry route.",
        lat: 14.163961515861006,
        lon: 121.23821626095294,
      },
      {
        name: "UP University Health Service",
        description: "Stop serving the University Health Service.",
        lat: 14.161996442247391,
        lon: 121.23868610580267,
      },
      {
        name: "CPAf",
        description:
          "Stop serving the College of Public Affairs and Development on the climb to the upper campus.",
        // ponytail: snapped to Domingo M. Lantican Avenue (OSM) beside CPAf.
        lat: 14.16021,
        lon: 121.2379,
      },
      {
        name: "Makiling Botanic Gardens",
        description: "Stop on the road by the Makiling Botanic Gardens.",
        // ponytail: snapped to the jeep's road nearest the gardens; the gate itself is inside.
        lat: 14.155884,
        lon: 121.235265,
      },
      {
        name: "Forestry Admin Building",
        description:
          "Stop on Martin R. Reyes in front of the College of Forestry and Natural Resources administration building.",
        // ponytail: placed from aerial imagery at the middle of the front facade, on Martin R. Reyes.
        lat: 14.155059,
        lon: 121.235241,
      },
      {
        name: "Forest Biological Sciences Building",
        description:
          "Upper-campus stop near the Forest Biological Sciences Building.",
        lat: 14.154758,
        lon: 121.235983,
      },
      {
        name: "Upper Forestry Jeep Terminal",
        description:
          "Upper-campus jeep terminal on Makiling Road, between the Forest Biological Sciences Building and the residence halls. Downhill trips start here.",
        // ponytail: placed from the owner's map sketch, on Makiling Road about two thirds of the way from Martin R. Reyes to Felix O. Chinte Sr.
        lat: 14.153693,
        lon: 121.235186,
      },
      {
        name: "New Forestry Residence Hall (New FOREHA)",
        description: "Stop at the New Forestry Residence Hall.",
        // ponytail: snapped to Makiling Road.
        lat: 14.152242,
        lon: 121.234185,
      },
      {
        name: "Makiling Residence Hall (MAREHA)",
        description:
          "Stop at the Makiling Residence Hall on Felix O. Chinte Sr.",
        // ponytail: snapped to Felix O. Chinte Sr.
        lat: 14.151894,
        lon: 121.235293,
      },
      {
        name: "Forestry Residence Hall (FOREHA)",
        description:
          "Last uphill stop, at the Forestry Residence Hall; the jeep heads back down campus from here.",
        // ponytail: snapped to Felix O. Chinte Sr.
        lat: 14.152521,
        lon: 121.235097,
      },
    ],
  },
  {
    id: "up-rural",
    name: "UP Rural / Jubileeville",
    description:
      "Runs from the campus core out along Pili Drive and the IPB Road to Paciano Rizal, UP Rural High School, and Jubileeville in Bay.",
    directionNote:
      "Outbound the jeep serves the stops as listed, ending at Jubileeville; it returns to campus along the same road in reverse.",
    color: "#1e3a8a",
    fare: STANDARD_CAMPUS_FARE,
    stops: [
      {
        name: "Makiling School",
        description:
          "Stop beside the UP Rural High School / Makiling School area.",
        lat: 14.165744564457338,
        lon: 121.24426410223518,
      },
      {
        name: "Old Rural-Saint Therese",
        description:
          "Stop near St. Therese and the old UP Rural High School site.",
        lat: 14.165120117289403,
        lon: 121.24456008780996,
      },
      {
        name: "CEAT Library",
        description: "Stop near the CEAT Library on the way out to Pili Drive.",
        // ponytail: anchored to the CEAT building pin; exact roadside stop unverified.
        lat: 14.162271,
        lon: 121.247953,
      },
      {
        name: "Pili Drive",
        description: "Stop along Pili Drive between campus and IRRI.",
        // ponytail: midpoint estimate on Pili Drive itself, verify on the ground.
        lat: 14.1654,
        lon: 121.2517,
      },
      {
        name: "IPB",
        description: "Stop at the Institute of Plant Breeding.",
        // ponytail: snapped onto the IPB Road corridor (Road North 1) where the jeep passes.
        lat: 14.153557,
        lon: 121.26499,
      },
      {
        name: "Paciano Rizal",
        description: "Stop in Barangay Paciano Rizal, Bay.",
        // ponytail: snapped onto Road North 1.
        lat: 14.152132,
        lon: 121.266056,
      },
      {
        name: "UP Rural High",
        description: "Stop at the UP Rural High School campus in Bay.",
        // ponytail: snapped onto Sampaguita Street on the jeep's path.
        lat: 14.150243,
        lon: 121.271372,
      },
      {
        name: "Jubileeville",
        description: "End of the route at Jubileeville subdivision, Bay.",
        lat: 14.1494971,
        lon: 121.2744736,
      },
    ],
  },
  {
    id: "snodlob",
    name: "UPLB Loop (SNODLOB e-jeep)",
    description:
      "Campus e-jeep loop on the route approved by the Office of the Vice Chancellor for Community Affairs (OVCCA). From the temporary e-jeep terminal at Copeland Gym it runs up Getulio B. Viado past the dormitories, around by the Main Library and OVCRE Annex, down past CAS, Physical Sciences and the Seniors' Social Garden to CEAT, then along Pili Drive past Crop Science and Animal Science to Vet Med and back to Copeland.",
    directionNote:
      "One way, in stop order. Look for the UPLB LOOP signboard: jeeps without it go straight to Pili Drive and Bay. In practice drivers do not always follow the approved route; some skip Getulio B. Viado and Copeland or detour on request. From Olivarez, ride Kanan and change at OVCRE Annex (stop 9).",
    color: "#15803d",
    fare: STANDARD_CAMPUS_FARE,
    stops: [
      {
        name: "EB Copeland Gymnasium (temporary e-jeep terminal)",
        description: "Temporary e-jeep terminal; start and end of the loop.",
        lat: 14.1566,
        lon: 121.24276,
      },
      {
        name: "UPLB New Dormitory",
        description: "Stop for the UPLB New Dormitory.",
        lat: 14.15571,
        lon: 121.24143,
      },
      {
        name: "ATI-NTC Residence Hall",
        description: "Stop on Getulio B. Viado for the ATI-NTC Residence Hall.",
        lat: 14.15615,
        lon: 121.24114,
      },
      {
        name: "Scholar's Dorm",
        description: "Stop on Getulio B. Viado for Scholar's Dorm.",
        lat: 14.16009,
        lon: 121.24075,
      },
      {
        name: "Veterinary Medicine Residence Hall",
        description:
          "Stop on Getulio B. Viado for the Veterinary Medicine Residence Hall.",
        lat: 14.16077,
        lon: 121.24031,
      },
      {
        name: "Women's Dormitory",
        description:
          "Stop on Jose B. Juliano Avenue for the Women's Dormitory.",
        lat: 14.16236,
        lon: 121.24056,
      },
      {
        name: "D.L. Umali Hall",
        description: "Stop on Jose B. Juliano Avenue for D.L. Umali Hall.",
        lat: 14.16371,
        lon: 121.23993,
      },
      {
        name: "UPLB Main Library",
        description: "Stop on Domingo M. Lantican Avenue for the Main Library.",
        lat: 14.16544,
        lon: 121.23857,
      },
      {
        name: "OVCRE Annex",
        description:
          "Stop on Jose R. Velasco Avenue. Riders coming from Olivarez on a Kanan jeep transfer here.",
        lat: 14.16721,
        lon: 121.24041,
      },
      {
        name: "Institute of Biological Sciences (IBS)",
        description: "Stop for the Institute of Biological Sciences.",
        lat: 14.16692,
        lon: 121.23971,
      },
      {
        name: "CAS Annex 1 / UPLB OUR",
        description:
          "Stop for CAS Annex 1 and the Office of the University Registrar.",
        lat: 14.16567,
        lon: 121.24087,
      },
      {
        name: "CAS / Oblation Park",
        description: "Stop for CAS and Oblation Park.",
        lat: 14.16471,
        lon: 121.24095,
      },
      {
        name: "Physical Sciences Building Wing A / UPLB Post Office",
        description:
          "Stop for Physical Sciences Wing A and the UPLB Post Office.",
        lat: 14.16404,
        lon: 121.24126,
      },
      {
        name: "UPLB Landscape Horticulture Research and Development Facility",
        description:
          "Stop on Andres P. Aglibut Avenue for the Landscape Horticulture R&D Facility.",
        lat: 14.1635,
        lon: 121.24298,
      },
      {
        name: "Seniors' Social Garden",
        description:
          "Stop on Andres P. Aglibut Avenue at the Seniors' Social Garden.",
        lat: 14.16268,
        lon: 121.24382,
      },
      {
        name: "CEAT Lecture Hall / CEAT-DCE / CEAT-DES / CEAT-CE",
        description: "Stop for the CEAT Lecture Hall and CEAT departments.",
        lat: 14.161,
        lon: 121.24493,
      },
      {
        name: "Food Biochemistry Lab, Institute of Food Science and Technology",
        description:
          "Stop on Pili Drive for the Institute of Food Science and Technology.",
        lat: 14.16034,
        lon: 121.24479,
      },
      {
        name: "Institute of Crop Science (iCropS)",
        description: "Stop on Pili Drive for the Institute of Crop Science.",
        lat: 14.16015,
        lon: 121.24439,
      },
      {
        name: "Institute of Animal Science",
        description: "Stop for the Institute of Animal Science.",
        lat: 14.15955,
        lon: 121.2437,
      },
      {
        name: "College of Veterinary Medicine",
        description:
          "Stop on Archibald R. Ward for the College of Veterinary Medicine.",
        lat: 14.15826,
        lon: 121.2433,
      },
      {
        name: "EB Copeland Gymnasium (temporary e-jeep terminal)",
        description: "Back at Copeland Gym: the loop ends where it started.",
        lat: 14.1566,
        lon: 121.24276,
      },
    ],
  },
];

/**
 * Rider tips transcribed from the UPLB Public Transit System Map (2024) by
 * Bernardo "Berniemack" Muerong Arellano III, shown in the route modal with
 * credit. Facts only; the map artwork itself is CC BY-NC-SA and is not reused.
 */
/** Tips for jeeps leaving Los Baños town (not campus-specific). */
export const TOWN_JEEPNEY_RIDING_NOTES: string[] = [
  "Board at Olivarez Plaza (College Junction). Outbound signboards: BAYAN (town proper), SM CROSSING, CROSSING CALAMBA, SAKAY/LALAKAY.",
  "Tell the driver where you are getting off; stops along the highway are not marked.",
];

export const JEEPNEY_RIDING_NOTES: string[] = [
  "Jeepneys from Calamba Crossing carry a UP COLLEGE or COLLEGE signboard; they may become Kaliwa, Kanan, Forestry, or UP Gate routes near campus. Check the windshield signboard or ask the driver.",
  "A UP GATE signboard means the jeep stops at Grove and does not enter campus.",
  "Hailing a jeep bound for Forestry or Upper Campus? Point your index finger upwards.",
  "Outbound signboards: BAYAN (town proper), OLIVAREZ (College Junction), SM CROSSING, CROSSING CALAMBA, SAKAY/LALAKAY.",
  "Campus stops have no official names or markers; hail or alight anywhere safe along the route.",
];

export const TRANSIT_DATA_CREDIT =
  'Route data cross-checked with the UPLB Public Transit System Map (2024) by Bernardo "Berniemack" Muerong Arellano III.';
