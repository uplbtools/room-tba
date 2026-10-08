/**
 * Turn a journey into the step list navigation reads out (#966 follow-up):
 * "Walk to UP University Health Service stop", "Board the Forestry jeep",
 * "Get off at …", "Walk to …". The top banner shows the current step; the
 * expanded sheet lists them all.
 *
 * ponytail: no turn-by-turn. The walk graph has no street names on its edges,
 * so a walk leg is one step to its end point, not a list of turns.
 */

import {
  distanceMeters,
  formatDistance,
  formatDuration,
} from "../campus-route";
import type { Journey, LatLng, RideLeg, RouteProgress } from "./journey";

export type JourneyStep = {
  kind: "walk" | "board" | "alight";
  /** Banner / list headline. */
  text: string;
  /** Supporting line: time, distance, stops. */
  detail: string;
  /** Index into journey.legs this step belongs to. */
  legIndex: number;
  /** Route colour for ride steps. */
  color?: string;
};

/** A walk shorter than this (boarding right at the origin) is not a step. */
const MIN_WALK_STEP_METERS = 10;
/** Within this of the stop, the next thing to do is board. */
const BOARD_CUE_METERS = 20;

type Place = LatLng & { label: string };

/** The named point (stop or destination) nearest a walk leg's end. */
function nearestPlace(places: Place[], at: [number, number] | undefined) {
  if (!at || places.length === 0) return null;
  let best = places[0]!;
  let bestMeters = Number.POSITIVE_INFINITY;
  for (const place of places) {
    const meters = distanceMeters(
      { lat: place.lat, lon: place.lng },
      { lat: at[1], lon: at[0] },
    );
    if (meters < bestMeters) {
      bestMeters = meters;
      best = place;
    }
  }
  return best;
}

/**
 * @param places Where walk legs can end: the waypoints and the destination,
 *   in trip order. Used to name a walk that does not end at a jeep stop.
 */
export function journeySteps(journey: Journey, places: Place[]): JourneyStep[] {
  const steps: JourneyStep[] = [];
  journey.legs.forEach((leg, legIndex) => {
    if (leg.kind === "walk") {
      if (leg.meters < MIN_WALK_STEP_METERS) return;
      const next = journey.legs[legIndex + 1];
      const target =
        next?.kind === "ride"
          ? `${next.boardStopName} stop`
          : (nearestPlace(places, leg.coordinates.at(-1))?.label ??
            "your destination");
      steps.push({
        kind: "walk",
        text: `Walk to ${target}`,
        detail: `${formatDuration(leg.seconds)}, ${formatDistance(leg.meters)}`,
        legIndex,
      });
      return;
    }
    const ride: RideLeg = leg;
    const stops = ride.stopCount - 1;
    steps.push({
      kind: "board",
      text: `Board the ${ride.routeName} jeep`,
      detail: `At ${ride.boardStopName}, about ${formatDuration(ride.waitSeconds)} wait`,
      legIndex,
      color: ride.color,
    });
    steps.push({
      kind: "alight",
      text: `Get off at ${ride.alightStopName}`,
      detail: `${stops} stop${stops === 1 ? "" : "s"}, ${formatDuration(
        ride.seconds - ride.waitSeconds,
      )}, ${formatDistance(ride.meters)}`,
      legIndex,
      color: ride.color,
    });
  });
  return steps;
}

/**
 * Which step the rider is on. Before the first GPS fix that is the first
 * step. Near the end of a walk to a stop the cue moves on to boarding, and
 * once riding it is the stop to get off at.
 */
export function currentStepIndex(
  steps: JourneyStep[],
  progress: RouteProgress | null,
): number {
  if (steps.length === 0 || !progress) return 0;
  const { legIndex, legTravelledMeters, legRemainingMeters } = progress;
  const onLeg = steps.filter((step) => step.legIndex === legIndex);
  if (onLeg.length === 0) {
    // A skipped (tiny) walk leg: the next real step is what comes up.
    const next = steps.findIndex((step) => step.legIndex > legIndex);
    return next < 0 ? steps.length - 1 : next;
  }
  const first = steps.indexOf(onLeg[0]!);
  if (onLeg[0]!.kind === "walk") {
    const after = steps[first + 1];
    return after?.kind === "board" && legRemainingMeters < BOARD_CUE_METERS
      ? first + 1
      : first;
  }
  // Ride leg: still at the stop means boarding is the step.
  return legTravelledMeters < BOARD_CUE_METERS ? first : first + 1;
}
