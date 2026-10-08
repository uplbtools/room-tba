import type { LineString } from "geojson";
import {
  type JeepneyRoute,
  type JeepneyStop,
  ROUTE_DIRECTIONS,
  type RouteDirection,
} from "@constants/jeepney-routes";
import { distanceMeters } from "./campus-route";
import { isLoopRoute } from "./transit-route-kind";

/** The two ways a route runs, or null for a one-way route. */
export function routeDirections(routeId: string) {
  return ROUTE_DIRECTIONS[routeId] ?? null;
}

/** The direction being shown, or null for a one-way route. */
export function activeDirection(
  routeId: string,
  reversed: boolean,
): RouteDirection | null {
  const directions = routeDirections(routeId);
  if (!directions) return null;
  return reversed ? directions.reverse : directions.forward;
}

/**
 * The route as ridden in one direction: same id, stops in riding order.
 * One-way routes never reverse; their stop order is the only real one.
 */
export function orientRoute(
  route: JeepneyRoute,
  reversed: boolean,
): JeepneyRoute {
  if (!reversed || !routeDirections(route.id)) return route;
  return { ...route, stops: [...route.stops].reverse() };
}

export function reverseLine(line: LineString | null): LineString | null {
  return line
    ? { ...line, coordinates: [...line.coordinates].reverse() }
    : null;
}

/** Stops this close are the same kerb on two routes' lists. */
const SAME_STOP_METERS = 60;

export type RouteAtStop = {
  route: JeepneyRoute;
  /** Index into the route's listed (forward) stop order. */
  stopIndex: number;
  /** "Kanan / Kaliwa", "Toward Jubileeville", "One-way loop", "Last stop". */
  direction: string;
};

function directionAt(route: JeepneyRoute, stopIndex: number): string {
  const directions = routeDirections(route.id);
  if (directions) {
    return `${directions.forward.label} / ${directions.reverse.label}`;
  }
  if (isLoopRoute(route)) return "One-way loop";
  const last = route.stops.length - 1;
  return stopIndex >= last ? "Last stop" : `Toward ${route.stops[last]!.name}`;
}

/**
 * Every route that stops at (or within a few metres of) `stop`, nearest stop
 * per route. Matching by position, not name: the e-jeep calls the Kaliwa
 * "Main Library" stop "UPLB Main Library".
 */
export function routesAtStop(
  routes: JeepneyRoute[],
  stop: Pick<JeepneyStop, "lat" | "lon">,
): RouteAtStop[] {
  const out: RouteAtStop[] = [];
  for (const route of routes) {
    let best = -1;
    let bestMeters = Number.POSITIVE_INFINITY;
    // Strictly nearer only, so a loop's closing stop never beats stop 1.
    route.stops.forEach((candidate, index) => {
      const meters = distanceMeters(candidate, stop);
      if (meters <= SAME_STOP_METERS && meters < bestMeters) {
        best = index;
        bestMeters = meters;
      }
    });
    if (best >= 0) {
      out.push({ route, stopIndex: best, direction: directionAt(route, best) });
    }
  }
  return out;
}
