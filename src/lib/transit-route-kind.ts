import { JEEPNEY_ROUTES } from "@constants/jeepney-routes";

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
