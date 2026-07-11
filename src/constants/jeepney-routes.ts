// src/constants/jeepney-routes.ts

import type { LineString } from "geojson";

export type JeepneyStop = {
  name: string;
  lat: number;
  lon: number;
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

/** Campus jeepney fares are set campus-wide, not per route. */
export const JEEPNEY_FARE_NOTE =
  "Indicative fare for the 2025-2026 school year; confirm with the driver.";

const STANDARD_CAMPUS_FARE: JeepneyFare = { regular: 13, discounted: 11 };

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

export const JEEPNEY_ROUTES: JeepneyRoute[] = [
  {
    id: "kaliwa-kanan",
    name: "Kaliwa / Kanan",
    description:
      "Loop between Olivarez Plaza in Los Baños town and the UPLB academic core, passing Raymundo Gate, the Main Library, the dormitories, and CEAT.",
    directionNote:
      "Kaliwa and Kanan are the same loop; the name says which way the jeep turns after entering the UPLB gate. Kaliwa turns left and follows the stops as listed (Carabao Park / DevCom first); Kanan turns right and serves the same stops in reverse (Carabao Park / Landbank first).",
    color: "#dc2626",
    fare: STANDARD_CAMPUS_FARE,
    stops: [
      { name: "Olivarez Plaza Mall", lat: 14.17903, lon: 121.23908 },
      {
        name: "Robinsons Town Mall",
        lat: 14.177349211032917,
        lon: 121.24242089688644,
      },
      {
        name: "Carabao Park / DevCom",
        lat: 14.167680673655115,
        lon: 121.24302990984792,
      },
      { name: "Raymundo Gate", lat: 14.16773707639881, lon: 121.2416075132719 },
      { name: "CAP-CSI", lat: 14.167227355646022, lon: 121.24044598783846 },
      { name: "Sacay", lat: 14.166436241690047, lon: 121.23861696327558 },
      { name: "Main Library", lat: 14.165440954550126, lon: 121.2386041983236 },
      {
        name: "Graduate School / Umali",
        lat: 14.163742377049818,
        lon: 121.23998877527784,
      },
      {
        name: "Women's Dormitory",
        lat: 14.162362067987052,
        lon: 121.24056837513993,
      },
      {
        name: "Men's Dormitory",
        lat: 14.16091203484906,
        lon: 121.2412408051354,
      },
      { name: "Baker Hall", lat: 14.161219041586817, lon: 121.24257006568956 },
      {
        name: "Animal Husbandry",
        lat: 14.15989413929804,
        lon: 121.24366990769977,
      },
      {
        name: "Agronomy Building",
        lat: 14.160182373364517,
        lon: 121.2443733752706,
      },
      {
        name: "College of Engineering and Agro-Industrial Technology",
        lat: 14.16087221013792,
        lon: 121.24495080555562,
      },
      {
        name: "Senior's Social Garden",
        lat: 14.162690186117826,
        lon: 121.2438403651636,
      },
      { name: "Headquarters", lat: 14.16352431907233, lon: 121.2437220269563 },
      {
        name: "St. Therese / Math Building",
        lat: 14.165120117289403,
        lon: 121.24456008780996,
      },
      {
        name: "Makiling School",
        lat: 14.165744564457338,
        lon: 121.24426410223518,
      },
      {
        name: "Carabao Park / Landbank",
        lat: 14.167026218728786,
        lon: 121.24373658223566,
      },
      { name: "Olivarez Plaza Mall", lat: 14.17903, lon: 121.23908 },
    ],
  },
  {
    id: "forestry",
    name: "Forestry",
    description:
      "Connects the campus core to the upper Forestry campus: from the Forestry jeep terminal past the Main Library area, Narra Bridge, and the University Health Service, climbing to the College of Forestry and Natural Resources.",
    color: "#15803d",
    fare: STANDARD_CAMPUS_FARE,
    stops: [
      {
        name: "Forestry Jeep Terminal",
        lat: 14.16809105957495,
        lon: 121.24248142545251,
      },
      {
        name: "CEM Jeepney Stop",
        lat: 14.167744858385788,
        lon: 121.24160128212628,
      },
      {
        name: "OVCRE Annex Building",
        lat: 14.167161010311109,
        lon: 121.24043389915563,
      },
      {
        name: "Narra Bridge",
        lat: 14.164723828661357,
        lon: 121.23847671766336,
      },
      {
        name: "Maria Makiling Statue",
        lat: 14.163961515861006,
        lon: 121.23821626095294,
      },
      {
        name: "UP University Health Service",
        lat: 14.161996442247391,
        lon: 121.23868610580267,
      },
      {
        name: "Forest Biological Sciences Building",
        lat: 14.154716857167369,
        lon: 121.2360341113496,
      },
    ],
  },
];
