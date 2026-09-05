import { describe, expect, test } from "bun:test";
import {
  ENDPOINT_SNAP_TOLERANCE_METERS,
  WALK_KPH,
} from "@constants/travel-modes";
import buildingsJson from "../../../exports/deep-research/buildings.json";
import walkGraphJson from "../../generated/walk-graph.json";
import { distanceMeters } from "../campus-route";
import {
  buildTravelGraph,
  nearestNodeIndex,
  type WalkGraphData,
} from "./engine";
import {
  isMainWalkComponentEdge,
  isMainWalkComponentNode,
  routeBuildingToBuilding,
  snapBuildingEndpoint,
  type BuildingRouteEndpoint,
} from "./building-route";

const buildings = buildingsJson as BuildingRouteEndpoint[];
const campus = buildTravelGraph(walkGraphJson as unknown as WalkGraphData);
const WALK_MPS = WALK_KPH / 3.6;

function findBuilding(name: string): BuildingRouteEndpoint {
  const building = buildings.find(
    (candidate) => candidate.buildingName.trim() === name,
  );
  if (!building) throw new Error(`missing baseline building: ${name}`);
  return building;
}

function oldNodeSnap(endpoint: BuildingRouteEndpoint): {
  nodeIndex: number;
  snapMeters: number;
} {
  if (endpoint.lat === null || endpoint.lon === null) {
    return { nodeIndex: -1, snapMeters: Number.POSITIVE_INFINITY };
  }
  const nodeIndex = nearestNodeIndex(campus, endpoint.lat, endpoint.lon, "walk");
  return {
    nodeIndex,
    snapMeters: distanceMeters(
      { lat: endpoint.lat, lon: endpoint.lon },
      {
        lat: campus.lat[nodeIndex] as number,
        lon: campus.lng[nodeIndex] as number,
      },
    ),
  };
}

function oldNodeSnapMeters(endpoint: BuildingRouteEndpoint): number {
  return oldNodeSnap(endpoint).snapMeters;
}

describe("building route real campus baseline", () => {
  test("edge correlation shortens or preserves connectors for legacy main-component endpoints", () => {
    let comparable = 0;
    let strictlyImproved = 0;
    for (const endpoint of buildings) {
      if (endpoint.lat === null || endpoint.lon === null) continue;
      const previous = oldNodeSnap(endpoint);
      if (!isMainWalkComponentNode(campus, previous.nodeIndex)) continue;

      comparable++;
      const snap = snapBuildingEndpoint(campus, {
        ...endpoint,
        lat: endpoint.lat,
        lon: endpoint.lon,
      });
      expect(snap.snapMeters, endpoint.buildingName).toBeLessThanOrEqual(
        previous.snapMeters + 1e-6,
      );
      if (snap.snapMeters < previous.snapMeters - 0.5) strictlyImproved++;
    }
    expect(comparable).toBeGreaterThan(0);
    expect(strictlyImproved).toBeGreaterThan(0);
  });

  test("routes every edge-correlated endpoint inside the hard ceiling to the core", () => {
    const anchor = findBuilding("CAS Main Building");
    let routed = 0;
    let offNetwork = 0;

    for (const endpoint of buildings) {
      if (endpoint.id === anchor.id) continue;
      if (endpoint.lat === null || endpoint.lon === null) {
        throw new Error(
          `${endpoint.buildingName} unexpectedly lacks a map pin`,
        );
      }

      const snap = snapBuildingEndpoint(campus, {
        ...endpoint,
        lat: endpoint.lat,
        lon: endpoint.lon,
      });
      const result = routeBuildingToBuilding({
        graph: campus,
        origin: endpoint,
        destination: anchor,
        maxSnapMeters: ENDPOINT_SNAP_TOLERANCE_METERS,
      });

      if (
        snap.snapMeters > ENDPOINT_SNAP_TOLERANCE_METERS ||
        !isMainWalkComponentEdge(campus, snap.edgeIndex)
      ) {
        offNetwork++;
        expect(result.status, endpoint.buildingName).toBe("origin-off-network");
        continue;
      }

      routed++;
      expect(result.status, endpoint.buildingName).toBe("ok");
      if (result.status !== "ok") continue;

      expect(result.originSnap.snapMeters, endpoint.buildingName).toBeCloseTo(
        snap.snapMeters,
        8,
      );
      expect(result.route.totalMeters, endpoint.buildingName).toBeCloseTo(
        result.route.graphMeters +
          result.originSnap.snapMeters +
          result.destinationSnap.snapMeters,
        8,
      );
      expect(result.route.totalSeconds, endpoint.buildingName).toBeCloseTo(
        result.route.graphSeconds +
          (result.originSnap.snapMeters + result.destinationSnap.snapMeters) /
            WALK_MPS,
        8,
      );
      expect(result.route.graphCoordinates[0], endpoint.buildingName).toEqual(
        result.originSnap.snappedCoordinate,
      );
      expect(
        result.route.graphCoordinates.at(-1),
        endpoint.buildingName,
      ).toEqual(result.destinationSnap.snappedCoordinate);
    }

    expect(routed).toBeGreaterThan(0);
    expect(offNetwork).toBeGreaterThan(0);
  });

  test("known off-campus teaching sites still fail closed", () => {
    const anchor = findBuilding("CAS Main Building");
    for (const name of ["UPRHS Building", "Veterinary Teaching Hospital"]) {
      const result = routeBuildingToBuilding({
        graph: campus,
        origin: findBuilding(name),
        destination: anchor,
        maxSnapMeters: ENDPOINT_SNAP_TOLERANCE_METERS,
      });
      expect(result.status, name).toBe("origin-off-network");
      if (result.status === "origin-off-network") {
        expect(result.originSnap.snapMeters, name).toBeGreaterThan(
          ENDPOINT_SNAP_TOLERANCE_METERS,
        );
      }
    }
  });

  test("New Math to Physical Sciences uses shorter edge connectors and continuous mapped geometry", () => {
    const origin = findBuilding("New Math Building");
    const destination = findBuilding("Physical Sciences Building");
    const result = routeBuildingToBuilding({
      graph: campus,
      origin,
      destination,
      maxSnapMeters: ENDPOINT_SNAP_TOLERANCE_METERS,
    });

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.originSnap.snapMeters).toBeLessThanOrEqual(
      oldNodeSnapMeters(origin) + 1e-6,
    );
    expect(result.destinationSnap.snapMeters).toBeLessThanOrEqual(
      oldNodeSnapMeters(destination) + 1e-6,
    );
    expect(result.route.graphMeters).toBeGreaterThan(0);
    expect(result.route.totalSeconds).toBeCloseTo(
      result.route.totalMeters / WALK_MPS,
      5,
    );
    expect(result.route.originConnectorCoordinates.at(-1)).toEqual(
      result.route.graphCoordinates[0],
    );
    expect(result.route.destinationConnectorCoordinates[0]).toEqual(
      result.route.graphCoordinates.at(-1),
    );
  });

  test("a cross-campus route remains graph-backed and finite", () => {
    const result = routeBuildingToBuilding({
      graph: campus,
      origin: findBuilding("CAS Main Building"),
      destination: findBuilding("CFNR Admin Building"),
      maxSnapMeters: ENDPOINT_SNAP_TOLERANCE_METERS,
    });

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.route.graphMeters).toBeGreaterThan(500);
    expect(result.route.totalMeters).toBeGreaterThanOrEqual(
      result.route.graphMeters,
    );
    expect(Number.isFinite(result.route.totalSeconds)).toBe(true);
    expect(result.route.totalSeconds).toBeGreaterThan(60);
  });
});
