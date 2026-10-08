/**
 * Directions session state (#966): where the rider is going, the ranked ways
 * to get there, and which one is drawn on the map.
 *
 * The search itself is pure and lives in lib/travel-graph; this only owns
 * session state and the lazy graph fetch, so the planner stays unit-testable
 * without a store.
 */

import {
  JEEPNEY_ROUTES,
  resolveRouteGeometry,
  type StoredRouteGeometry,
} from "@constants/jeepney-routes";
import jeepneyGeometries from "@constants/jeepney-geometries.json";
import type {
  Journey,
  LatLng,
  PlanStatus,
  RouteLines,
} from "../travel-graph/journey";
import { planMultiLegJourneys } from "../travel-graph/plan-multi-leg";
import { journeyLineCoordinates } from "../travel-graph/route-proximity";
import { loadTravelGraph } from "../travel-graph/load";

export type DirectionsPhase = "idle" | "planning" | "ready" | "error";

export type DirectionsEndpoint = LatLng & {
  label: string;
  /** Picked by tapping empty map, so no entity pin marks it. */
  dropped?: boolean;
};

/** Which end of the trip the next search pick or map tap fills. */
export type DirectionsPick = "origin" | "destination";

/** Max intermediate stops between origin and destination. */
export const MAX_DIRECTIONS_WAYPOINTS = 3;

/** Label for an origin that follows the GPS fix. */
export const YOUR_LOCATION_LABEL = "Your location";

/**
 * Road geometry per campus route, so a ride leg follows the street rather
 * than a chord between stops. Stops-only routes are left out on purpose: a
 * guessed line is no better than the chord.
 */
const ROUTE_LINES: RouteLines = Object.fromEntries(
  JEEPNEY_ROUTES.flatMap((route) => {
    const { source, line } = resolveRouteGeometry(
      route,
      jeepneyGeometries as Record<string, StoredRouteGeometry>,
    );
    return source !== "stops-only" && line
      ? [[route.id, line.coordinates as [number, number][]]]
      : [];
  }),
);

/** Travel-mode tab: the kinds a journey can be. */
export type DirectionsMode = Journey["kind"];

/**
 * Plain snapshot of a directions session, for a URL or history entry. The
 * store does not write the URL itself; whoever owns routing reads
 * getSnapshot() and hands it back to restore().
 */
export type DirectionsSnapshot = {
  origin: DirectionsEndpoint | null;
  /** False when the origin follows GPS ("Your location"). */
  originFixed: boolean;
  destination: DirectionsEndpoint | null;
  waypoints: DirectionsEndpoint[];
  mode: DirectionsMode | null;
  navigating: boolean;
};

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
  /** Set while the rider is choosing a start or end point. */
  picking: DirectionsPick | null = $state(null);
  /**
   * True when the rider chose the start point. GPS fixes then leave the
   * origin alone instead of replanning from the blue dot.
   */
  originFixed: boolean = $state(false);
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

  /** The quickest option, marked "Fastest" on its card. */
  get fastestId(): string | null {
    // Plans arrive ranked fastest first.
    return this.journeys[0]?.id ?? null;
  }

  /** One tab per mode that has an option, with its quickest time. */
  get modes(): { mode: DirectionsMode; seconds: number }[] {
    const out: { mode: DirectionsMode; seconds: number }[] = [];
    for (const mode of ["walk", "transit"] as const) {
      const best = this.journeys.find((journey) => journey.kind === mode);
      if (best) out.push({ mode, seconds: best.seconds });
    }
    return out;
  }

  /** The selected option's mode drives which tab is active. */
  get mode(): DirectionsMode | null {
    return this.selected?.kind ?? null;
  }

  /** The session as plain data (copies, safe to serialise). */
  getSnapshot = (): DirectionsSnapshot => {
    return {
      origin: this.origin ? { ...this.origin } : null,
      originFixed: this.originFixed,
      destination: this.destination ? { ...this.destination } : null,
      waypoints: this.waypoints.map((stop) => ({ ...stop })),
      mode: this.mode,
      navigating: this.navigating,
    };
  };

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
    this.picking = null;
    this.originFixed = false;
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
        routeLines: ROUTE_LINES,
      });

      // Ranked fastest first, so the default pick is the quickest way there.
      // A replan keeps the rider's mode tab when that mode still has options.
      const keepMode = this.mode;
      this.journeys = plan.journeys;
      this.status = plan.status;
      this.selectedId =
        (keepMode && plan.journeys.find((j) => j.kind === keepMode)?.id) ||
        (plan.journeys[0]?.id ?? null);
      this.phase = "ready";
    } catch {
      if (token !== this.#planToken) return;
      this.journeys = [];
      this.status = null;
      this.phase = "error";
    }
  };

  /**
   * Start a session from a chosen point, such as "Directions from here" on a
   * dropped pin. The next search pick or map tap becomes the destination.
   */
  openFrom = (origin: DirectionsEndpoint) => {
    this.close();
    this.origin = origin;
    this.originFixed = true;
    this.picking = "destination";
    this.phase = "planning";
  };

  /**
   * Directions from the home screen: start at the GPS fix (or wait for it)
   * and ask where to. Like openFrom, but the start follows the blue dot.
   */
  openEmpty = (origin: DirectionsEndpoint | null) => {
    this.close();
    this.origin = origin;
    this.originFixed = false;
    this.picking = "destination";
    this.phase = "planning";
  };

  /**
   * Swap start and end (⇅). A GPS start becomes a fixed end at the current
   * fix; with no start yet the old end becomes the start and the end is asked
   * for again.
   */
  swap = async () => {
    const origin = this.origin;
    const destination = this.destination;
    this.picking = null;
    this.addingStop = false;
    this.waypoints = [...this.waypoints].reverse();
    this.origin = destination;
    this.originFixed = destination !== null;
    this.destination = origin;
    if (!this.origin || !this.destination) {
      // Nothing to plan from yet: drop the stale route and ask for the gap.
      this.#planToken++;
      this.journeys = [];
      this.selectedId = null;
      this.status = null;
      this.phase = "planning";
      this.picking = this.origin ? "destination" : "origin";
      return;
    }
    await this.replan(this.origin, this.destination);
  };

  /**
   * Rebuild a session from getSnapshot(), e.g. on Back or a shared link. A
   * GPS start ("Your location") with no fix yet waits for one, as open() does.
   */
  restore = async (snapshot: DirectionsSnapshot) => {
    this.close();
    this.origin = snapshot.origin ? { ...snapshot.origin } : null;
    this.originFixed = snapshot.originFixed && snapshot.origin !== null;
    this.destination = snapshot.destination
      ? { ...snapshot.destination }
      : null;
    this.waypoints = snapshot.waypoints.map((stop) => ({ ...stop }));
    this.phase = "planning";
    if (!this.destination) {
      this.picking = "destination";
      return;
    }
    if (!this.origin) return;
    await this.replan(this.origin, this.destination);
    if (snapshot.mode) this.selectMode(snapshot.mode);
    if (snapshot.navigating) this.startNavigation();
  };

  /** Show the quickest option of a travel mode (the mode tabs). */
  selectMode = (mode: DirectionsMode) => {
    const best = this.journeys.find((journey) => journey.kind === mode);
    if (best) this.selectedId = best.id;
  };

  /**
   * Change where the trip starts. `fixed` false hands the origin back to GPS,
   * which is what "Use my location" does.
   */
  setOrigin = async (origin: DirectionsEndpoint | null, fixed = true) => {
    this.picking = null;
    this.originFixed = fixed && origin !== null;
    this.origin = origin;
    if (!origin) {
      // Waiting on GPS: drop the old plan so no stale route stays drawn.
      this.#planToken++;
      this.journeys = [];
      this.selectedId = null;
      this.status = null;
      if (this.destination) this.phase = "planning";
      return;
    }
    if (!this.destination) return;
    await this.replan(origin, this.destination);
  };

  setDestination = async (destination: DirectionsEndpoint) => {
    this.picking = null;
    this.destination = destination;
    if (!this.origin) return; // still waiting on GPS
    await this.replan(this.origin, destination);
  };

  beginPick = (which: DirectionsPick) => {
    this.addingStop = false;
    this.picking = which;
  };

  cancelPick = () => {
    this.picking = null;
  };

  /**
   * Route a search pick or map tap into the session: a start point, an end
   * point or an extra stop. Returns false when nothing was waiting for one.
   */
  takePick = (endpoint: DirectionsEndpoint): boolean => {
    if (!this.active) return false;
    if (this.picking === "origin") {
      void this.setOrigin(endpoint);
      return true;
    }
    if (this.picking === "destination") {
      void this.setDestination(endpoint);
      return true;
    }
    if (this.addingStop) {
      void this.addWaypoint(endpoint);
      return true;
    }
    return false;
  };

  /** Replan using current origin/destination/waypoints. */
  refresh = async () => {
    if (!this.origin || !this.destination) return;
    await this.replan(this.origin, this.destination);
  };

  beginAddStop = () => {
    if (this.waypoints.length >= MAX_DIRECTIONS_WAYPOINTS) return;
    this.picking = null;
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
    this.picking = null;
    this.originFixed = false;
    this.journeys = [];
    this.selectedId = null;
    this.status = null;
    this.onClose?.();
  };
}
