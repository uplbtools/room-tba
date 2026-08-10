/**
 * Multi-modal journey search: walk-only and walk + campus jeepney (#966).
 *
 * Runs entirely client-side on the vendored walk graph, so directions work
 * offline and cost no API calls. The whole search is two Dijkstra runs:
 *
 *   1. from the origin — walking seconds to every node, hence to every stop
 *   2. from the destination — walking seconds from every stop to the end
 *
 * Walking is symmetric on this graph, so run 2 doubles as the egress table.
 * Every board/alight pair is then a table lookup, which keeps the ride search
 * at O(routes x stops^2) over ~20 stops — microseconds, no worker needed.
 *
 * ponytail: no timetable, no transfers between routes. Campus jeeps run on
 * headway rather than a schedule, and the two routes meet only near the core
 * where walking already wins, so a two-ride itinerary would be modelled noise.
 */

import {
  ENDPOINT_SNAP_TOLERANCE_METERS,
  JEEPNEY_KPH,
  JEEPNEY_WAIT_SECONDS,
  MAX_ACCESS_WALK_METERS,
  MAX_JOURNEY_OPTIONS,
  MIN_RIDE_SAVING_SECONDS,
  STOP_SNAP_TOLERANCE_METERS,
  WALK_KPH,
} from "@constants/travel-modes";
import type { JeepneyFare, JeepneyRoute } from "@constants/jeepney-routes";
import { distanceMeters } from "../campus-route";
import {
  dijkstra,
  nearestNodeIndex,
  reconstructPath,
  type TravelGraph,
} from "./engine";

export type LatLng = { lat: number; lng: number };

export type WalkLeg = {
  kind: "walk";
  seconds: number;
  meters: number;
  /** [lng, lat] GeoJSON order. */
  coordinates: [number, number][];
};

export type RideLeg = {
  kind: "ride";
  routeId: string;
  routeName: string;
  color: string;
  fare: JeepneyFare;
  boardStopName: string;
  alightStopName: string;
  /** Stops passed through, board and alight inclusive. */
  stopCount: number;
  /** Expected wait at the boarding stop, already counted in `seconds`. */
  waitSeconds: number;
  seconds: number;
  meters: number;
  coordinates: [number, number][];
};

export type JourneyLeg = WalkLeg | RideLeg;

export type Journey = {
  /** Stable across a search, so the UI can key a selection. */
  id: string;
  kind: "walk" | "transit";
  /** Total door-to-door seconds, including the boarding wait. */
  seconds: number;
  /** Total distance travelled across every leg. */
  meters: number;
  /** Walking portion only — the number riders actually care about. */
  walkMeters: number;
  legs: JourneyLeg[];
  /** Present on transit journeys; campus fares are per boarding. */
  fare: JeepneyFare | null;
  /**
   * The ride leg is drawn through the stop list, not a road-traced line.
   * Mirrors the "stops-only" provenance vocabulary in jeepney-routes.ts.
   */
  geometrySource: "walk-graph" | "stops-only";
};

const WALK_MPS = WALK_KPH / 3.6;
const JEEPNEY_MPS = JEEPNEY_KPH / 3.6;

/** A route walked in a given direction, as an ordered stop list. */
type DirectedRoute = {
  route: JeepneyRoute;
  /** "" for the listed order, " (reverse)" for the mirrored run. */
  suffix: string;
  stops: JeepneyRoute["stops"];
};

/**
 * Both ways round. Kaliwa and Kanan are the same loop driven in opposite
 * directions, and the Forestry line is served up and down, so a rider can
 * always board in whichever direction gets them there sooner.
 */
function directedRoutes(routes: JeepneyRoute[]): DirectedRoute[] {
  const out: DirectedRoute[] = [];
  for (const route of routes) {
    if (route.stops.length < 2) continue;
    out.push({ route, suffix: "", stops: route.stops });
    out.push({
      route,
      suffix: " (reverse)",
      stops: [...route.stops].reverse(),
    });
  }
  return out;
}

/** Cumulative metres along a stop list, so any i..j span is one subtraction. */
function cumulativeMeters(stops: JeepneyRoute["stops"]): number[] {
  const cumulative = [0];
  for (let i = 1; i < stops.length; i++) {
    cumulative.push(cumulative[i - 1] + distanceMeters(stops[i - 1], stops[i]));
  }
  return cumulative;
}

export type PlanJourneysInput = {
  graph: TravelGraph;
  origin: LatLng;
  destination: LatLng;
  routes: JeepneyRoute[];
  /** Test seam; defaults to the campus-wide constant. */
  maxOptions?: number;
};

/**
 * Why a plan came back empty. The walk graph stops at the campus edge, so
 * "we do not map that far" is a routine outcome, not a failure — and it reads
 * very differently to the rider than "there is no way to get there".
 */
export type PlanStatus =
  | "ok"
  | "origin-off-network"
  | "destination-off-network"
  | "no-route";

export type JourneyPlan = {
  status: PlanStatus;
  journeys: Journey[];
};

/** Nearest node, or null when the point is too far off the mapped network. */
function snapEndpoint(graph: TravelGraph, point: LatLng): number | null {
  const node = nearestNodeIndex(graph, point.lat, point.lng);
  const snapMeters = distanceMeters(
    { lat: point.lat, lon: point.lng },
    { lat: graph.lat[node], lon: graph.lng[node] },
  );
  return snapMeters > ENDPOINT_SNAP_TOLERANCE_METERS ? null : node;
}

/**
 * Rank the ways a rider could make this trip, best time first.
 *
 * Always leads with the walk-only option when one exists — on a 2 km campus
 * that is usually the honest answer — then adds the ride options that save
 * enough time to be worth the wait.
 */
export function planJourneys({
  graph,
  origin,
  destination,
  routes,
  maxOptions = MAX_JOURNEY_OPTIONS,
}: PlanJourneysInput): JourneyPlan {
  const originNode = snapEndpoint(graph, origin);
  if (originNode === null) {
    return { status: "origin-off-network", journeys: [] };
  }
  const destNode = snapEndpoint(graph, destination);
  if (destNode === null) {
    return { status: "destination-off-network", journeys: [] };
  }

  const fromOrigin = dijkstra(graph, originNode, "walk");
  const fromDestination = dijkstra(graph, destNode, "walk");

  const journeys: Journey[] = [];

  const walkPath = reconstructPath(graph, fromOrigin, originNode, destNode);
  if (walkPath) {
    journeys.push({
      id: "walk",
      kind: "walk",
      seconds: walkPath.seconds,
      meters: walkPath.meters,
      walkMeters: walkPath.meters,
      legs: [{ kind: "walk", ...walkPath }],
      fare: null,
      geometrySource: "walk-graph",
    });
  }

  const walkOnlySeconds = walkPath?.seconds ?? Number.POSITIVE_INFINITY;

  for (const { route, suffix, stops } of directedRoutes(routes)) {
    // Snapping is unconditional, so a stop far off the mapped network would
    // otherwise inherit a neighbouring node's walk time. Drop those instead.
    const stopNodes = stops.map((stop) => {
      const node = nearestNodeIndex(graph, stop.lat, stop.lon);
      const snapMeters = distanceMeters(stop, {
        lat: graph.lat[node],
        lon: graph.lng[node],
      });
      return snapMeters > STOP_SNAP_TOLERANCE_METERS ? -1 : node;
    });
    const cumulative = cumulativeMeters(stops);

    let best: { board: number; alight: number; seconds: number } | null = null;

    for (let board = 0; board < stops.length - 1; board++) {
      if (stopNodes[board] < 0) continue;
      const accessSeconds = fromOrigin.seconds[stopNodes[board]];
      if (!Number.isFinite(accessSeconds)) continue;
      if (accessSeconds * WALK_MPS > MAX_ACCESS_WALK_METERS) continue;

      for (let alight = board + 1; alight < stops.length; alight++) {
        if (stopNodes[alight] < 0) continue;
        const egressSeconds = fromDestination.seconds[stopNodes[alight]];
        if (!Number.isFinite(egressSeconds)) continue;
        if (egressSeconds * WALK_MPS > MAX_ACCESS_WALK_METERS) continue;

        const rideMeters = cumulative[alight] - cumulative[board];
        if (rideMeters <= 0) continue;

        const total =
          accessSeconds +
          JEEPNEY_WAIT_SECONDS +
          rideMeters / JEEPNEY_MPS +
          egressSeconds;

        if (!best || total < best.seconds) {
          best = { board, alight, seconds: total };
        }
      }
    }

    if (!best) continue;
    // A ride that barely beats walking is not worth standing at a stop for.
    if (best.seconds > walkOnlySeconds - MIN_RIDE_SAVING_SECONDS) continue;

    const access = reconstructPath(
      graph,
      fromOrigin,
      originNode,
      stopNodes[best.board],
    );
    const egressReversed = reconstructPath(
      graph,
      fromDestination,
      destNode,
      stopNodes[best.alight],
    );
    if (!access || !egressReversed) continue;

    // Run 2 is rooted at the destination, so its path arrives backwards.
    const egress: WalkLeg = {
      kind: "walk",
      seconds: egressReversed.seconds,
      meters: egressReversed.meters,
      coordinates: [...egressReversed.coordinates].reverse(),
    };

    const ridden = stops.slice(best.board, best.alight + 1);
    const rideMeters = cumulative[best.alight] - cumulative[best.board];
    const ride: RideLeg = {
      kind: "ride",
      routeId: route.id,
      routeName: route.name,
      color: route.color,
      fare: route.fare,
      boardStopName: stops[best.board].name,
      alightStopName: stops[best.alight].name,
      stopCount: ridden.length,
      waitSeconds: JEEPNEY_WAIT_SECONDS,
      seconds: JEEPNEY_WAIT_SECONDS + rideMeters / JEEPNEY_MPS,
      meters: rideMeters,
      coordinates: ridden.map((stop) => [stop.lon, stop.lat]),
    };

    journeys.push({
      id: `${route.id}${suffix}`,
      kind: "transit",
      seconds: access.seconds + ride.seconds + egress.seconds,
      meters: access.meters + ride.meters + egress.meters,
      walkMeters: access.meters + egress.meters,
      legs: [{ kind: "walk", ...access }, ride, egress],
      fare: route.fare,
      geometrySource: "stops-only",
    });
  }

  journeys.sort((a, b) => a.seconds - b.seconds);

  // One option per route: the reverse run is the same jeep, and offering both
  // directions of one loop reads as two choices when it is really one.
  const seenRoutes = new Set<string>();
  const deduped = journeys.filter((journey) => {
    if (journey.kind === "walk") return true;
    const routeId = journey.legs.find(
      (leg): leg is RideLeg => leg.kind === "ride",
    )?.routeId;
    if (!routeId || seenRoutes.has(routeId)) return false;
    seenRoutes.add(routeId);
    return true;
  });

  return {
    status: deduped.length > 0 ? "ok" : "no-route",
    journeys: deduped.slice(0, maxOptions),
  };
}

/** Rider-facing copy per status; null when there is nothing to explain. */
export const PLAN_STATUS_NOTES: Record<PlanStatus, string | null> = {
  ok: null,
  "origin-off-network":
    "Your starting point is outside the mapped campus paths, so we cannot plan this trip yet.",
  "destination-off-network":
    "That destination is outside the mapped campus paths, so we cannot plan this trip yet.",
  "no-route":
    "No campus path connects these two points in our map. It may still be walkable.",
};

/**
 * Where the rider is along a drawn journey, and what is left of it.
 *
 * Live navigation re-runs this on every GPS tick, so it is a linear scan over
 * the polyline with no allocation per segment. Progress is measured by the
 * closest point on the line rather than by distance to the destination, so
 * stepping off the path sideways does not read as progress.
 */
export type RouteProgress = {
  /** Metres still to travel along the line. */
  remainingMeters: number;
  /** Seconds left, scaled from the journey's own average pace. */
  remainingSeconds: number;
  /** How far off the line the rider is — large means they have strayed. */
  offRouteMeters: number;
  /** 0-1 along the journey. */
  fraction: number;
};

/** Perpendicular distance from p to segment ab, plus how far along ab it lands. */
function projectOnSegment(
  p: LatLng,
  a: [number, number],
  b: [number, number],
): { offMeters: number; alongMeters: number; segmentMeters: number } {
  const toMeters = (lng: number, lat: number) => {
    const meanLat = ((a[1] + p.lat) / 2) * (Math.PI / 180);
    return {
      x: lng * Math.cos(meanLat) * 111_320,
      y: lat * 111_320,
    };
  };
  const pa = toMeters(a[0], a[1]);
  const pb = toMeters(b[0], b[1]);
  const pp = toMeters(p.lng, p.lat);
  const dx = pb.x - pa.x;
  const dy = pb.y - pa.y;
  const segmentMeters = Math.hypot(dx, dy);
  if (segmentMeters === 0) {
    return {
      offMeters: Math.hypot(pp.x - pa.x, pp.y - pa.y),
      alongMeters: 0,
      segmentMeters: 0,
    };
  }
  const t = Math.max(
    0,
    Math.min(
      1,
      ((pp.x - pa.x) * dx + (pp.y - pa.y) * dy) /
        (segmentMeters * segmentMeters),
    ),
  );
  const projX = pa.x + t * dx;
  const projY = pa.y + t * dy;
  return {
    offMeters: Math.hypot(pp.x - projX, pp.y - projY),
    alongMeters: t * segmentMeters,
    segmentMeters,
  };
}

export function routeProgress(
  journey: Journey,
  position: LatLng,
): RouteProgress | null {
  const line = journey.legs.flatMap((leg) => leg.coordinates);
  if (line.length < 2) return null;

  // Cumulative length so the remainder is one subtraction once we know where
  // on the line the rider is.
  const cumulative = [0];
  for (let i = 1; i < line.length; i++) {
    cumulative.push(
      cumulative[i - 1] +
        distanceMeters(
          { lat: line[i - 1][1], lon: line[i - 1][0] },
          { lat: line[i][1], lon: line[i][0] },
        ),
    );
  }
  const total = cumulative[cumulative.length - 1];
  if (total === 0) return null;

  let bestOff = Number.POSITIVE_INFINITY;
  let bestTravelled = 0;
  for (let i = 1; i < line.length; i++) {
    const { offMeters, alongMeters } = projectOnSegment(
      position,
      line[i - 1],
      line[i],
    );
    if (offMeters < bestOff) {
      bestOff = offMeters;
      bestTravelled = cumulative[i - 1] + alongMeters;
    }
  }

  const remainingMeters = Math.max(0, total - bestTravelled);
  // Scale by the journey's own pace rather than a walking constant: a transit
  // journey's average includes the ride and the boarding wait.
  const pace = journey.seconds / total;
  return {
    remainingMeters,
    remainingSeconds: remainingMeters * pace,
    offRouteMeters: bestOff,
    fraction: Math.max(0, Math.min(1, bestTravelled / total)),
  };
}

/** "8 min walk · 2 stops on Kaliwa / Kanan" — the option-row subtitle. */
export function describeJourney(journey: Journey): string {
  const ride = journey.legs.find((leg): leg is RideLeg => leg.kind === "ride");
  if (!ride) return "Walking the whole way";
  const walkMinutes = Math.max(
    1,
    Math.round(journey.walkMeters / WALK_MPS / 60),
  );
  const stops = ride.stopCount - 1;
  return `${walkMinutes} min walk · ${stops} stop${stops === 1 ? "" : "s"} on ${ride.routeName}`;
}
