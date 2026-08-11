/**
 * Directions session state (#966): where the rider is going, the ranked ways
 * to get there, and which one is drawn on the map.
 *
 * The search itself is pure and lives in lib/travel-graph; this only owns
 * session state and the lazy graph fetch, so the planner stays unit-testable
 * without a store.
 */

import { JEEPNEY_ROUTES } from "@constants/jeepney-routes";
import {
  type Journey,
  type LatLng,
  type PlanStatus,
} from "../travel-graph/journey";
import { planMultiLegJourneys } from "../travel-graph/plan-multi-leg";
import { journeyLineCoordinates } from "../travel-graph/route-proximity";
import { loadTravelGraph } from "../travel-graph/load";

export type DirectionsPhase = "idle" | "planning" | "ready" | "error";

export type DirectionsEndpoint = LatLng & { label: string };

/** Max intermediate stops between origin and destination. */
export const MAX_DIRECTIONS_WAYPOINTS = 3;

export class DirectionsStore {
  phase: DirectionsPhase = $state("idle");
  origin: DirectionsEndpoint | null = $state(null);
  destination: DirectionsEndpoint | null = $state(null);
  /** Ordered intermediates between origin and destination. */
  waypoints: DirectionsEndpoint[] = $state([]);
  /**
   * When true, the next entity pick (map tap / Directions chip) inserts a
   * waypoint instead of replacing the destination.
   */
  addingStop: boolean = $state(false);
  journeys: Journey[] = $state([]);
  selectedId: string | null = $state(null);
  /** Why an empty result is empty; drives the rider-facing note. */
  status: PlanStatus | null = $state(null);

  /**
   * Turn-by-turn-style follow mode: tilted camera locked to the rider's
   * heading. Separate from `active` because the option list and the follow
   * camera are different screens over the same plan.
   */
  navigating: boolean = $state(false);

  /**
   * Whether the camera is still locked to the rider. A manual pan releases it
   * (as GMaps does) and the recentre button takes it back.
   */
  cameraFollowing: boolean = $state(true);

  /** Guards against a slow plan landing after a newer one. */
  #planToken = 0;

  get active(): boolean {
    return this.phase !== "idle";
  }

  get selected(): Journey | null {
    if (this.journeys.length === 0) return null;
    return (
      this.journeys.find((journey) => journey.id === this.selectedId) ??
      this.journeys[0]
    );
  }

  /** Total seconds for the selected option — the "12 min" headline. */
  get selectedSeconds(): number | null {
    return this.selected?.seconds ?? null;
  }

  /** Selected journey polyline for pin proximity / map draw. */
  get selectedRouteCoords(): [number, number][] {
    const journey = this.selected;
    if (!journey) return [];
    return journeyLineCoordinates(journey.legs);
  }

  /** Origin → waypoints → destination (for UI list and replan). */
  get routePoints(): DirectionsEndpoint[] {
    const points: DirectionsEndpoint[] = [];
    if (this.origin) points.push(this.origin);
    points.push(...this.waypoints);
    if (this.destination) points.push(this.destination);
    return points;
  }

  open = async (
    destination: DirectionsEndpoint,
    origin: DirectionsEndpoint | null,
  ) => {
    this.destination = destination;
    this.origin = origin;
    this.waypoints = [];
    this.addingStop = false;
    this.selectedId = null;
    this.journeys = [];
    this.status = null;

    if (!origin) {
      // Waiting on a GPS fix; replan() runs once coords arrive.
      this.phase = "planning";
      return;
    }
    await this.replan(origin, destination);
  };

  /** Re-run the search, e.g. when the GPS fix finally lands or improves. */
  replan = async (
    origin: DirectionsEndpoint,
    destination: DirectionsEndpoint,
  ) => {
    const token = ++this.#planToken;
    this.phase = "planning";
    this.origin = origin;
    this.destination = destination;

    try {
      const graph = await loadTravelGraph();
      if (token !== this.#planToken) return; // superseded

      const points: LatLng[] = [origin, ...this.waypoints, destination];
      const plan = planMultiLegJourneys({
        graph,
        points,
        routes: JEEPNEY_ROUTES,
      });

      this.journeys = plan.journeys;
      this.status = plan.status;
      this.selectedId = plan.journeys[0]?.id ?? null;
      this.phase = "ready";
    } catch {
      if (token !== this.#planToken) return;
      this.journeys = [];
      this.status = null;
      this.phase = "error";
    }
  };

  /** Replan using current origin/destination/waypoints. */
  refresh = async () => {
    if (!this.origin || !this.destination) return;
    await this.replan(this.origin, this.destination);
  };

  beginAddStop = () => {
    if (this.waypoints.length >= MAX_DIRECTIONS_WAYPOINTS) return;
    this.addingStop = true;
  };

  cancelAddStop = () => {
    this.addingStop = false;
  };

  addWaypoint = async (stop: DirectionsEndpoint) => {
    if (this.waypoints.length >= MAX_DIRECTIONS_WAYPOINTS) {
      this.addingStop = false;
      return;
    }
    // Skip near-duplicates of an existing stop / destination.
    const same = (a: DirectionsEndpoint, b: DirectionsEndpoint) =>
      Math.abs(a.lat - b.lat) < 1e-5 && Math.abs(a.lng - b.lng) < 1e-5;
    if (this.destination && same(stop, this.destination)) {
      this.addingStop = false;
      return;
    }
    if (this.waypoints.some((w) => same(w, stop))) {
      this.addingStop = false;
      return;
    }

    this.waypoints = [...this.waypoints, stop];
    this.addingStop = false;
    await this.refresh();
  };

  removeWaypoint = async (index: number) => {
    if (index < 0 || index >= this.waypoints.length) return;
    this.waypoints = this.waypoints.filter((_, i) => i !== index);
    await this.refresh();
  };

  moveWaypoint = async (from: number, to: number) => {
    if (
      from < 0 ||
      to < 0 ||
      from >= this.waypoints.length ||
      to >= this.waypoints.length ||
      from === to
    ) {
      return;
    }
    const next = [...this.waypoints];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    this.waypoints = next;
    await this.refresh();
  };

  select = (id: string) => {
    this.selectedId = id;
  };

  startNavigation = () => {
    if (!this.selected) return;
    this.navigating = true;
    this.cameraFollowing = true;
    this.addingStop = false;
  };

  stopNavigation = () => {
    this.navigating = false;
    this.cameraFollowing = true;
  };

  /** A manual pan drops the camera lock; the recentre button restores it. */
  releaseCamera = () => {
    this.cameraFollowing = false;
  };

  recenter = () => {
    this.cameraFollowing = true;
  };

  /**
   * Tear down the session. `onClose` clears cross-store leftovers (legacy
   * OSRM destination) without this module importing locationStore.
   */
  onClose: (() => void) | null = null;

  close = () => {
    this.#planToken++;
    this.phase = "idle";
    this.navigating = false;
    this.cameraFollowing = true;
    this.origin = null;
    this.destination = null;
    this.waypoints = [];
    this.addingStop = false;
    this.journeys = [];
    this.selectedId = null;
    this.status = null;
    this.onClose?.();
  };
}
