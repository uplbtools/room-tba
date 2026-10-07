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
 * ponytail: no timetable. Campus jeeps run on headway rather than a schedule.
 * Transfers are planned only for a trip end off the campus walk network (a
 * town terminal like Olivarez Plaza): ride the town jeep to a campus stop,
 * then plan the rest as usual. Inside campus the routes meet only near the
 * core where walking already wins, so on-campus two-ride trips stay out.
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
import { perBoardingFare } from "../transit-route-kind";
import { activeDirection } from "../transit-direction";
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
  /** One boarding's price, when known (campus jeeps); null otherwise. */
  fare: JeepneyFare | null;
  boardStopName: string;
  alightStopName: string;
  /** Stops passed through, board and alight inclusive. */
  stopCount: number;
  /** Their names in riding order, board and alight inclusive. */
  stopNames: string[];
  /** "Kaliwa" / "Kanan" for a two-way route; null when it runs one way. */
  directionLabel: string | null;
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
  reversed: boolean;
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
    out.push({ route, suffix: "", reversed: false, stops: route.stops });
    out.push({
      route,
      suffix: " (reverse)",
      reversed: true,
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
/**
 * A trip end off the campus walk network (Olivarez Plaza, where Kaliwa/Kanan
 * starts, is in town) can still start or end at a jeep stop this close, as a
 * straight walk. Without it, "from the jeep terminal" could not be planned.
 */
const OFF_NETWORK_STOP_RADIUS_METERS = 350;
/** Straight-line walks run longer on real streets. */
const STRAIGHT_WALK_DETOUR = 1.3;

function straightWalk(from: LatLng, to: LatLng): WalkLeg {
  const meters =
    distanceMeters(
      { lat: from.lat, lon: from.lng },
      { lat: to.lat, lon: to.lng },
    ) * STRAIGHT_WALK_DETOUR;
  return {
    kind: "walk",
    seconds: meters / WALK_MPS,
    meters,
    coordinates: [
      [from.lng, from.lat],
      [to.lng, to.lat],
    ],
  };
}

function nearAnyStop(point: LatLng, routes: JeepneyRoute[]): boolean {
  return routes.some((route) =>
    route.stops.some(
      (stop) =>
        distanceMeters({ lat: point.lat, lon: point.lng }, stop) <=
        OFF_NETWORK_STOP_RADIUS_METERS,
    ),
  );
}

function planDirect({
  graph,
  origin,
  destination,
  routes,
  maxOptions = MAX_JOURNEY_OPTIONS,
}: PlanJourneysInput): JourneyPlan {
  const originNode = snapEndpoint(graph, origin);
  if (originNode === null && !nearAnyStop(origin, routes)) {
    return { status: "origin-off-network", journeys: [] };
  }
  const destNode = snapEndpoint(graph, destination);
  if (destNode === null && !nearAnyStop(destination, routes)) {
    return { status: "destination-off-network", journeys: [] };
  }

  const fromOrigin =
    originNode === null ? null : dijkstra(graph, originNode, "walk");
  const fromDestination =
    destNode === null ? null : dijkstra(graph, destNode, "walk");

  const journeys: Journey[] = [];

  const walkPath =
    fromOrigin && originNode !== null && destNode !== null
      ? reconstructPath(graph, fromOrigin, originNode, destNode)
      : null;
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

  for (const { route, suffix, reversed, stops } of directedRoutes(routes)) {
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

    // Seconds on foot between a trip end and a stop: along the walk network
    // when the end is on it, else a short straight walk (see
    // OFF_NETWORK_STOP_RADIUS_METERS), else unreachable.
    const footSeconds = (
      tree: typeof fromOrigin,
      end: LatLng,
      index: number,
    ): number => {
      if (tree) {
        const node = stopNodes[index] ?? -1;
        return node < 0
          ? Number.POSITIVE_INFINITY
          : (tree.seconds[node] ?? Number.POSITIVE_INFINITY);
      }
      const stop = stops[index]!;
      const meters = distanceMeters({ lat: end.lat, lon: end.lng }, stop);
      return meters <= OFF_NETWORK_STOP_RADIUS_METERS
        ? (meters * STRAIGHT_WALK_DETOUR) / WALK_MPS
        : Number.POSITIVE_INFINITY;
    };

    for (let board = 0; board < stops.length - 1; board++) {
      const accessSeconds = footSeconds(fromOrigin, origin, board);
      if (!Number.isFinite(accessSeconds)) continue;
      if (accessSeconds * WALK_MPS > MAX_ACCESS_WALK_METERS) continue;

      for (let alight = board + 1; alight < stops.length; alight++) {
        const egressSeconds = footSeconds(fromDestination, destination, alight);
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

    const boardStop = stops[best.board]!;
    const alightStop = stops[best.alight]!;
    const access =
      fromOrigin && originNode !== null
        ? reconstructPath(graph, fromOrigin, originNode, stopNodes[best.board]!)
        : straightWalk(origin, { lat: boardStop.lat, lng: boardStop.lon });
    const egressReversed =
      fromDestination && destNode !== null
        ? reconstructPath(
            graph,
            fromDestination,
            destNode,
            stopNodes[best.alight]!,
          )
        : straightWalk(destination, {
            lat: alightStop.lat,
            lng: alightStop.lon,
          });
    if (!access || !egressReversed) continue;

    // The destination side is rooted at the destination, so its path arrives
    // backwards.
    const egress: WalkLeg = {
      kind: "walk",
      seconds: egressReversed.seconds,
      meters: egressReversed.meters,
      coordinates: [...egressReversed.coordinates].reverse(),
    };

    const ride = buildRideLeg(route, stops, best.board, best.alight, reversed);

    journeys.push({
      id: `${route.id}${suffix}`,
      kind: "transit",
      seconds: access.seconds + ride.seconds + egress.seconds,
      meters: access.meters + ride.meters + egress.meters,
      walkMeters: access.meters + egress.meters,
      legs: [{ kind: "walk", ...access }, ride, egress],
      fare: ride.fare,
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
    status:
      deduped.length > 0
        ? "ok"
        : originNode === null
          ? "origin-off-network"
          : destNode === null
            ? "destination-off-network"
            : "no-route",
    journeys: deduped.slice(0, maxOptions),
  };
}

function buildRideLeg(
  route: JeepneyRoute,
  stops: JeepneyRoute["stops"],
  board: number,
  alight: number,
  reversed: boolean,
): RideLeg {
  const ridden = stops.slice(board, alight + 1);
  const cumulative = cumulativeMeters(stops);
  const rideMeters = cumulative[alight]! - cumulative[board]!;
  return {
    kind: "ride",
    routeId: route.id,
    routeName: route.name,
    color: route.color,
    // Town jeeps charge by distance, so a partial ride has no known price.
    fare: perBoardingFare(route),
    boardStopName: stops[board]!.name,
    alightStopName: stops[alight]!.name,
    stopCount: ridden.length,
    stopNames: ridden.map((stop) => stop.name),
    directionLabel: activeDirection(route.id, reversed)?.label ?? null,
    waitSeconds: JEEPNEY_WAIT_SECONDS,
    seconds: JEEPNEY_WAIT_SECONDS + rideMeters / JEEPNEY_MPS,
    meters: rideMeters,
    coordinates: ridden.map((stop) => [stop.lon, stop.lat]),
  };
}

function addFares(a: JeepneyFare | null, b: JeepneyFare | null) {
  if (!a) return b;
  if (!b) return a;
  return {
    regular: a.regular + b.regular,
    discounted: a.discounted + b.discounted,
  };
}

function joinJourneys(id: string, parts: (JourneyLeg[] | Journey)[]): Journey {
  const legs = parts.flatMap((part) =>
    Array.isArray(part) ? part : part.legs,
  );
  // A total is only quoted when every ride's price is known.
  const rides = legs.filter((leg): leg is RideLeg => leg.kind === "ride");
  const fare = rides.every((leg) => leg.fare)
    ? rides.reduce<JeepneyFare | null>(
        (sum, leg) => addFares(sum, leg.fare),
        null,
      )
    : null;
  return {
    id,
    kind: "transit",
    seconds: legs.reduce((sum, leg) => sum + leg.seconds, 0),
    meters: legs.reduce((sum, leg) => sum + leg.meters, 0),
    walkMeters: legs
      .filter((leg) => leg.kind === "walk")
      .reduce((sum, leg) => sum + leg.meters, 0),
    legs,
    fare,
    geometrySource: "stops-only",
  };
}

/**
 * Two-ride trips for an end off the campus walk network: from a town stop
 * near the origin, ride to any campus stop and plan the rest from there (or,
 * mirrored, plan to a campus stop and ride out to a town stop near the
 * destination). One best option per town route.
 */
function transferJourneys(input: PlanJourneysInput): Journey[] {
  const { graph, origin, destination, routes } = input;
  const originOff = snapEndpoint(graph, origin) === null;
  const destOff = snapEndpoint(graph, destination) === null;
  if (originOff === destOff) return [];
  const end = originOff ? origin : destination;
  const best = new Map<string, Journey>();

  for (const { route, suffix, reversed, stops } of directedRoutes(routes)) {
    const others = routes.filter((r) => r.id !== route.id);
    for (let i = 0; i < stops.length; i++) {
      const here = stops[i]!;
      const near = distanceMeters({ lat: end.lat, lon: end.lng }, here);
      if (near > OFF_NETWORK_STOP_RADIUS_METERS) continue;
      const townStop = { lat: here.lat, lng: here.lon };
      // Ride from the town stop (origin side) or to it (destination side).
      const span = originOff
        ? stops.map((_, j) => j).filter((j) => j > i)
        : stops.map((_, j) => j).filter((j) => j < i);
      for (const j of span) {
        const campusStop = { lat: stops[j]!.lat, lng: stops[j]!.lon };
        if (snapEndpoint(graph, campusStop) === null) continue;
        const rest = planDirect({
          graph,
          origin: originOff ? campusStop : origin,
          destination: originOff ? destination : campusStop,
          routes: others,
        });
        for (const leg of rest.journeys) {
          const journey = originOff
            ? joinJourneys(`${route.id}${suffix}>${leg.id}`, [
                [
                  straightWalk(origin, townStop),
                  buildRideLeg(route, stops, i, j, reversed),
                ],
                leg,
              ])
            : joinJourneys(`${leg.id}>${route.id}${suffix}`, [
                leg,
                [
                  buildRideLeg(route, stops, j, i, reversed),
                  reverseWalk(straightWalk(destination, townStop)),
                ],
              ]);
          const current = best.get(route.id);
          if (!current || journey.seconds < current.seconds) {
            best.set(route.id, journey);
          }
        }
      }
    }
  }
  return [...best.values()];
}

function reverseWalk(leg: WalkLeg): WalkLeg {
  return { ...leg, coordinates: [...leg.coordinates].reverse() };
}

/**
 * Rank the ways a rider could make this trip, best time first: walk-only and
 * single rides, plus a town-jeep transfer when one end is off campus.
 */
export function planJourneys(input: PlanJourneysInput): JourneyPlan {
  const direct = planDirect(input);
  const transfers = transferJourneys(input);
  if (transfers.length === 0) return direct;
  const journeys = [...direct.journeys, ...transfers]
    .sort((a, b) => a.seconds - b.seconds)
    .slice(0, input.maxOptions ?? MAX_JOURNEY_OPTIONS);
  return { status: "ok", journeys };
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
  const rides = journey.legs.filter(
    (leg): leg is RideLeg => leg.kind === "ride",
  );
  if (rides.length === 0) return "Walking the whole way";
  const walkMinutes = Math.max(
    1,
    Math.round(journey.walkMeters / WALK_MPS / 60),
  );
  const ridden = rides
    .map((ride) => {
      const stops = ride.stopCount - 1;
      return `${stops} stop${stops === 1 ? "" : "s"} on ${ride.routeName}`;
    })
    .join(", then ");
  return `${walkMinutes} min walk · ${ridden}`;
}
