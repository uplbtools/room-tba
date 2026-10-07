import {
  FARES_VERIFIED_NOTE,
  JEEPNEY_FARE_NOTE,
  JEEPNEY_ROUTES,
  type JeepneyFare,
  type RouteTicketing,
  routeTicketing,
  TOWN_JEEPNEY_MINIMUM_FARE,
  VERIFIED_END_TO_END_FARES,
} from "@constants/jeepney-routes";

/**
 * What kind of service a transit route is. Routes carry no type column: the
 * campus jeeps are the bundled ones, the rest come from the database seed
 * (scripts/seed-transit-routes.ts). Without this every DLTB and provincial
 * bus was headed "… jeepney route" and showed campus-jeep fares and tips.
 */
export type TransitRouteKind = "campus" | "town" | "bus";

const CAMPUS_ROUTE_IDS = new Set(JEEPNEY_ROUTES.map((route) => route.id));
const BUS_ROUTE_IDS = new Set([
  "uplb-to-upd",
  "upd-to-uplb",
  "lb-to-buendia",
  "buendia-to-lb",
]);

export function transitRouteKind(route: {
  id: string;
  name: string;
}): TransitRouteKind {
  if (CAMPUS_ROUTE_IDS.has(route.id)) return "campus";
  if (BUS_ROUTE_IDS.has(route.id) || /\bbus(es)?\b/i.test(route.name)) {
    return "bus";
  }
  return "town";
}

/** "jeepney route" / "bus route", for headings and titles. */
export function transitRouteNoun(route: { id: string; name: string }) {
  return transitRouteKind(route) === "bus" ? "bus route" : "jeepney route";
}

/** "Jeepney stop" / "Bus stop". */
export function transitStopNoun(route: { id: string; name: string }) {
  return transitRouteKind(route) === "bus" ? "Bus stop" : "Jeepney stop";
}

type StopLike = { name: string; lat: number; lon: number };

/**
 * A loop route lists its terminal twice (Kaliwa/Kanan: Olivarez Plaza is
 * stop 1 and stop 20, same spot). Drawn as two pins, the second sat on top
 * of the first, so stop 1 could not be tapped and the count read 20 for 19
 * places.
 */
export function isLoopRoute(route: { stops: StopLike[] }): boolean {
  const { stops } = route;
  if (stops.length < 3) return false;
  const first = stops[0]!;
  const last = stops[stops.length - 1]!;
  const metersApart = Math.hypot(
    (last.lon - first.lon) * 111_320 * Math.cos((first.lat * Math.PI) / 180),
    (last.lat - first.lat) * 111_320,
  );
  return (
    metersApart < 30 &&
    first.name.trim().toLowerCase() === last.name.trim().toLowerCase()
  );
}

/** Places a rider can board at: a loop's closing stop is not a new one. */
export function distinctStopCount(route: { stops: StopLike[] }): number {
  return route.stops.length - (isLoopRoute(route) ? 1 : 0);
}

/**
 * What the app may say about a route's fare. Only prices confirmed on
 * FARES_VERIFIED_ON are quoted; the stored database fare is not shown.
 * - fixed: campus jeeps, one price per boarding.
 * - end-to-end: a confirmed whole-route price; shorter rides cost less.
 * - distance: town jeeps with only the minimum confirmed.
 * - ticketed: booked on the operator's site, which has the price.
 * - unverified: nothing confirmed yet.
 */
export type RouteFareInfo =
  | { kind: "fixed"; fare: JeepneyFare; note: string }
  | {
      kind: "end-to-end";
      fare: JeepneyFare;
      minimum: JeepneyFare;
      note: string;
    }
  | { kind: "distance"; minimum: JeepneyFare; note: string }
  | { kind: "ticketed"; ticketing: RouteTicketing }
  | { kind: "unverified"; note: string };

const CAMPUS_FARE = JEEPNEY_ROUTES[0]!.fare;

const minimumText = (fare: JeepneyFare) =>
  `the ₱${fare.regular} minimum (₱${fare.discounted} student, senior or PWD) plus a per-kilometre amount from the LTFRB fare matrix`;

export function routeFareInfo(route: {
  id: string;
  name: string;
}): RouteFareInfo {
  const ticketing = routeTicketing(route.id);
  if (ticketing) return { kind: "ticketed", ticketing };
  const kind = transitRouteKind(route);
  if (kind === "campus") {
    return { kind: "fixed", fare: CAMPUS_FARE, note: JEEPNEY_FARE_NOTE };
  }
  const endToEnd = VERIFIED_END_TO_END_FARES[route.id];
  if (endToEnd) {
    const destination =
      route.name.split(/\s*(?:→|->)\s*/).at(-1) ?? "the end of the line";
    return {
      kind: "end-to-end",
      fare: endToEnd,
      minimum: TOWN_JEEPNEY_MINIMUM_FARE,
      note: `₱${endToEnd.regular} is for riding all the way to ${destination}. Shorter rides cost ${minimumText(TOWN_JEEPNEY_MINIMUM_FARE)}. ${FARES_VERIFIED_NOTE}`,
    };
  }
  if (kind === "town") {
    return {
      kind: "distance",
      minimum: TOWN_JEEPNEY_MINIMUM_FARE,
      note: `Fare is ${minimumText(TOWN_JEEPNEY_MINIMUM_FARE)}. The fare to the end of the line is not verified yet. ${FARES_VERIFIED_NOTE}`,
    };
  }
  return {
    kind: "unverified",
    note: "Fare not verified yet. Ask the conductor or at the terminal.",
  };
}

/** The price of one boarding, when the app knows it: campus jeeps only. */
export function perBoardingFare(route: {
  id: string;
  name: string;
}): JeepneyFare | null {
  const info = routeFareInfo(route);
  return info.kind === "fixed" ? info.fare : null;
}
