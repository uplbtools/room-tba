import { ENDPOINT_SNAP_TOLERANCE_METERS } from "@constants/travel-modes";
import {
  routeBuildingToBuilding,
  type BuildingRouteEndpoint,
  type BuildingWalkRouteResult,
} from "../travel-graph/building-route";
import { loadTravelGraph } from "../travel-graph/load";
import { deactivateMapModesExcept, registerMapMode } from "./map-modes";

export type BuildingRoutePhase =
  | "idle"
  | "selecting"
  | "planning"
  | "ready"
  | "error";

/**
 * Session state for the two-building walking router.
 *
 * It owns only selection + lazy planning. The routing math remains pure in
 * travel-graph/building-route.ts, and map rendering remains in a component.
 */
export class BuildingRouteStore {
  phase: BuildingRoutePhase = $state("idle");
  origin: BuildingRouteEndpoint | null = $state(null);
  destination: BuildingRouteEndpoint | null = $state(null);
  result: BuildingWalkRouteResult | null = $state(null);
  #planToken = 0;

  get active(): boolean {
    return this.phase !== "idle";
  }

  get route() {
    return this.result?.status === "ok" ? this.result.route : null;
  }

  open = () => {
    deactivateMapModesExcept("building-route");
    if (this.phase === "idle") this.phase = "selecting";
  };

  close = () => {
    this.#planToken++;
    this.phase = "idle";
    this.origin = null;
    this.destination = null;
    this.result = null;
  };

  clearOrigin = () => {
    this.#planToken++;
    this.origin = null;
    this.result = null;
    if (this.active) this.phase = "selecting";
  };

  clearDestination = () => {
    this.#planToken++;
    this.destination = null;
    this.result = null;
    if (this.active) this.phase = "selecting";
  };

  setOrigin = async (building: BuildingRouteEndpoint) => {
    this.origin = building;
    await this.refresh();
  };

  setDestination = async (building: BuildingRouteEndpoint) => {
    this.destination = building;
    await this.refresh();
  };

  swap = async () => {
    this.#planToken++;
    const previousOrigin = this.origin;
    this.origin = this.destination;
    this.destination = previousOrigin;
    this.result = null;
    await this.refresh();
  };

  refresh = async () => {
    const origin = this.origin;
    const destination = this.destination;
    const token = ++this.#planToken;
    this.result = null;

    if (!origin || !destination) {
      if (this.active) this.phase = "selecting";
      return;
    }

    this.phase = "planning";
    try {
      const graph = await loadTravelGraph();
      if (token !== this.#planToken) return;

      this.result = routeBuildingToBuilding({
        graph,
        origin,
        destination,
        maxSnapMeters: ENDPOINT_SNAP_TOLERANCE_METERS,
      });
      if (token !== this.#planToken) return;
      this.phase = "ready";
    } catch {
      if (token !== this.#planToken) return;
      this.result = null;
      this.phase = "error";
    }
  };
}

export const buildingRouteStore = new BuildingRouteStore();
registerMapMode("building-route", { disable: buildingRouteStore.close });
