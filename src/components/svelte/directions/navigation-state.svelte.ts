/**
 * What navigation shows, derived once for the top banner and the sheet:
 * progress along the selected journey, its steps, and which one is current.
 */

import { directionsStore, locationStore } from "@lib/store.svelte";
import { routeProgress } from "@lib/travel-graph/journey";
import {
  currentStepIndex,
  journeySteps,
} from "@lib/travel-graph/journey-steps";

/** Past this the rider is not on the drawn line any more. */
export const OFF_ROUTE_METERS = 40;
/** Closer than this to the end reads as arrived. */
const ARRIVED_METERS = 15;

class NavigationState {
  journey = $derived(directionsStore.selected);

  progress = $derived.by(() => {
    const coords = locationStore.coords;
    if (!this.journey || !coords) return null;
    return routeProgress(this.journey, { lat: coords[1], lng: coords[0] });
  });

  steps = $derived.by(() => {
    if (!this.journey) return [];
    const destination = directionsStore.destination;
    return journeySteps(this.journey, [
      ...directionsStore.waypoints,
      ...(destination ? [destination] : []),
    ]);
  });

  stepIndex = $derived(currentStepIndex(this.steps, this.progress));

  /** Falls back to the planned totals until the first fix lands. */
  remainingSeconds = $derived(
    this.progress?.remainingSeconds ?? this.journey?.seconds ?? 0,
  );
  remainingMeters = $derived(
    this.progress?.remainingMeters ?? this.journey?.meters ?? 0,
  );

  offRouteMeters = $derived(this.progress?.offRouteMeters ?? 0);
  offRoute = $derived(this.offRouteMeters > OFF_ROUTE_METERS);
  arrived = $derived(
    this.progress !== null && this.remainingMeters < ARRIVED_METERS,
  );
}

export const navigationState = new NavigationState();
