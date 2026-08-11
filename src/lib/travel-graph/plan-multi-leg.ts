/**
 * Stitch origin → waypoints → destination into ranked Walk / Commute options
 * by calling planJourneys per hop (#966 route UI).
 */

import { MAX_JOURNEY_OPTIONS } from "@constants/travel-modes";
import type { JeepneyRoute } from "@constants/jeepney-routes";
import type { TravelGraph } from "./engine";
import {
  type Journey,
  type JourneyLeg,
  type JourneyPlan,
  type LatLng,
  type PlanStatus,
  type RideLeg,
  planJourneys,
} from "./journey";

export type PlanMultiLegInput = {
  graph: TravelGraph;
  /** Ordered: origin, optional waypoints, destination (length ≥ 2). */
  points: LatLng[];
  routes: JeepneyRoute[];
  maxOptions?: number;
};

function stitchLegs(segments: Journey[]): {
  legs: JourneyLeg[];
  seconds: number;
  meters: number;
  walkMeters: number;
  fare: Journey["fare"];
  rideCount: number;
  routeNames: string[];
} {
  const legs: JourneyLeg[] = [];
  let seconds = 0;
  let meters = 0;
  let walkMeters = 0;
  let fare: Journey["fare"] = null;
  const routeNames: string[] = [];
  let rideCount = 0;

  for (const segment of segments) {
    for (const leg of segment.legs) {
      legs.push(leg);
      if (leg.kind === "ride") {
        rideCount++;
        if (!routeNames.includes(leg.routeName)) routeNames.push(leg.routeName);
        if (!fare) fare = leg.fare;
      }
    }
    seconds += segment.seconds;
    meters += segment.meters;
    walkMeters += segment.walkMeters;
  }

  return { legs, seconds, meters, walkMeters, fare, rideCount, routeNames };
}

function buildJourney(id: string, segments: Journey[]): Journey | null {
  if (segments.length === 0 || segments.some((s) => !s)) return null;
  const stitched = stitchLegs(segments);
  if (stitched.legs.length === 0) return null;

  const kind = stitched.rideCount > 0 ? "transit" : "walk";
  const geometrySource =
    stitched.rideCount > 0 &&
    segments.every(
      (s) => s.kind === "transit" || s.geometrySource === "stops-only",
    )
      ? "stops-only"
      : "walk-graph";

  return {
    id,
    kind,
    seconds: stitched.seconds,
    meters: stitched.meters,
    walkMeters: stitched.walkMeters,
    legs: stitched.legs,
    fare: stitched.fare,
    geometrySource,
  };
}

/** Card title: Walk / Commute (Route) / Commute (partial). */
export function journeyOptionLabel(journey: Journey): string {
  if (journey.kind === "walk") return "Walk";
  const rides = journey.legs.filter(
    (leg): leg is RideLeg => leg.kind === "ride",
  );
  if (rides.length === 0) return "Walk";
  const names = [...new Set(rides.map((r) => r.routeName))];
  if (journey.id.includes("partial") || names.length > 1) {
    return names.length === 1
      ? `Commute (partial) · ${names[0]}`
      : "Commute (partial)";
  }
  return names.length === 1 ? `Commute · ${names[0]}` : "Commute";
}

/**
 * Plan a multi-stop trip. Walk stays first; commute variants follow by ETA.
 * With no intermediate points this delegates to planJourneys.
 */
export function planMultiLegJourneys({
  graph,
  points,
  routes,
  maxOptions = MAX_JOURNEY_OPTIONS,
}: PlanMultiLegInput): JourneyPlan {
  if (points.length < 2) {
    return { status: "no-route", journeys: [] };
  }

  if (points.length === 2) {
    const plan = planJourneys({
      graph,
      origin: points[0],
      destination: points[1],
      routes,
      maxOptions,
    });
    // Pin Walk as the baseline card even when a jeep is faster.
    const walk = plan.journeys.filter((j) => j.kind === "walk");
    const rest = plan.journeys
      .filter((j) => j.kind !== "walk")
      .sort((a, b) => a.seconds - b.seconds);
    return {
      ...plan,
      journeys: [...walk, ...rest].slice(0, maxOptions),
    };
  }

  const segmentPlans: JourneyPlan[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const plan = planJourneys({
      graph,
      origin: points[i],
      destination: points[i + 1],
      routes,
      maxOptions,
    });
    if (plan.status === "origin-off-network" && i === 0) {
      return { status: "origin-off-network", journeys: [] };
    }
    if (plan.status === "destination-off-network" && i === points.length - 2) {
      return { status: "destination-off-network", journeys: [] };
    }
    if (plan.journeys.length === 0) {
      return { status: "no-route", journeys: [] };
    }
    segmentPlans.push(plan);
  }

  const journeys: Journey[] = [];

  // 1. All-walk
  const walkSegments = segmentPlans.map((p) =>
    p.journeys.find((j) => j.kind === "walk"),
  );
  if (walkSegments.every((j): j is Journey => j != null)) {
    const walk = buildJourney("walk", walkSegments);
    if (walk) journeys.push(walk);
  }

  // 2. Prefer a single named route across hops when that route has a transit
  //    option on every hop; otherwise fall back to walk for missing hops
  //    (partial).
  const routeIds = new Set<string>();
  for (const plan of segmentPlans) {
    for (const j of plan.journeys) {
      if (j.kind !== "transit") continue;
      const ride = j.legs.find((leg): leg is RideLeg => leg.kind === "ride");
      if (ride) routeIds.add(ride.routeId);
    }
  }

  for (const routeId of routeIds) {
    const segments: Journey[] = [];
    let usedWalkFallback = false;
    let ok = true;
    for (const plan of segmentPlans) {
      const transit = plan.journeys.find((j) => {
        if (j.kind !== "transit") return false;
        return j.legs.some(
          (leg) => leg.kind === "ride" && leg.routeId === routeId,
        );
      });
      if (transit) {
        segments.push(transit);
      } else {
        const walk = plan.journeys.find((j) => j.kind === "walk");
        if (!walk) {
          ok = false;
          break;
        }
        usedWalkFallback = true;
        segments.push(walk);
      }
    }
    if (!ok) continue;
    const id = usedWalkFallback
      ? `commute-${routeId}-partial`
      : `commute-${routeId}`;
    const journey = buildJourney(id, segments);
    if (journey) journeys.push(journey);
  }

  // 3. Fastest-per-hop mix (may blend routes) — only if it beats options above.
  const fastestSegments = segmentPlans.map((p) => {
    const sorted = [...p.journeys].sort((a, b) => a.seconds - b.seconds);
    return sorted[0];
  });
  if (fastestSegments.every(Boolean)) {
    const hasRide = fastestSegments.some((j) => j.kind === "transit");
    const mixedRoutes = new Set(
      fastestSegments.flatMap((j) =>
        j.legs
          .filter((leg): leg is RideLeg => leg.kind === "ride")
          .map((leg) => leg.routeId),
      ),
    );
    if (
      hasRide &&
      (mixedRoutes.size > 1 || fastestSegments.some((j) => j.kind === "walk"))
    ) {
      const mixed = buildJourney("commute-mixed-partial", fastestSegments);
      if (
        mixed &&
        !journeys.some(
          (j) =>
            j.seconds === mixed.seconds &&
            j.meters === mixed.meters &&
            j.kind === mixed.kind,
        )
      ) {
        journeys.push(mixed);
      }
    }
  }

  // Walk first, then by ETA; cap.
  const walk = journeys.filter((j) => j.kind === "walk");
  const rest = journeys
    .filter((j) => j.kind !== "walk")
    .sort((a, b) => a.seconds - b.seconds);
  const ranked = [...walk, ...rest].slice(0, maxOptions);

  const status: PlanStatus = ranked.length > 0 ? "ok" : "no-route";
  return { status, journeys: ranked };
}
