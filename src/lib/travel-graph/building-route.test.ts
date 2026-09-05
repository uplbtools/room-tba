import { describe, expect, test } from "bun:test";
import { WALK_KPH } from "@constants/travel-modes";
import { distanceMeters } from "../campus-route";
import {
  buildTravelGraph,
  type TravelGraph,
  type WalkGraphData,
} from "./engine";
import {
  isMainWalkComponentEdge,
  isMainWalkComponentNode,
  isValidBuildingRouteCoordinate,
  mainWalkComponentMask,
  routeBuildingToBuilding,
  snapBuildingEndpoint,
  type BuildingRouteEndpoint,
} from "./building-route";

const METERS_PER_DEGREE = 111_320;
const WALK_MPS = WALK_KPH / 3.6;

const lineFixture: WalkGraphData = {
  meta: { coordScale: 1e6, nodeCount: 3, edgeCount: 2 },
  nodes: [
    [100, 14, 121],
    [101, 14, 121.001],
    [102, 14, 121.002],
  ],
  edges: [
    [0, 1, 100, "footway", null, []],
    [1, 2, 100, "footway", null, []],
  ],
};
const lineGraph = buildTravelGraph(lineFixture);

function building(
  id: number,
  buildingName: string,
  lat: number | null,
  lon: number | null,
): BuildingRouteEndpoint {
  return { id, buildingName, lat, lon };
}

describe("building route endpoint validation", () => {
  test("accepts finite geographic coordinates only", () => {
    expect(
      isValidBuildingRouteCoordinate(building(1, "A", 14.16, 121.24)),
    ).toBe(true);
    expect(isValidBuildingRouteCoordinate(building(1, "A", null, 121.24))).toBe(
      false,
    );
    expect(
      isValidBuildingRouteCoordinate(building(1, "A", Number.NaN, 121.24)),
    ).toBe(false);
    expect(isValidBuildingRouteCoordinate(building(1, "A", 91, 121.24))).toBe(
      false,
    );
    expect(isValidBuildingRouteCoordinate(building(1, "A", 14.16, 181))).toBe(
      false,
    );
  });

  test("fails closed when graph topology is structurally invalid", () => {
    const mismatched = {
      ...lineGraph,
      lng: new Float64Array([121, 121.001]),
    };
    expect(() => mainWalkComponentMask(mismatched)).toThrow(
      /coordinate arrays have different lengths/i,
    );

    const invalidEdge = {
      ...lineGraph,
      edges: [[0, 99, 100, "footway", null, []]] as WalkGraphData["edges"],
    };
    expect(() => mainWalkComponentMask(invalidEdge)).toThrow(
      /out-of-range edge/i,
    );
  });

  test("snap exposes the closest point on an edge and exact pin connector", () => {
    const endpoint = building(
      1,
      "A",
      14 + 30 / METERS_PER_DEGREE,
      121.0005,
    );
    if (!isValidBuildingRouteCoordinate(endpoint)) throw new Error("fixture");
    const snap = snapBuildingEndpoint(lineGraph, endpoint);

    expect(snap.edgeIndex).toBe(0);
    expect(snap.fractionAlongEdge).toBeCloseTo(0.5, 3);
    expect(snap.snapMeters).toBeCloseTo(30, 4);
    expect(snap.snappedCoordinate[0]).toBeCloseTo(121.0005, 8);
    expect(snap.snappedCoordinate[1]).toBeCloseTo(14, 8);
    expect(snap.endpointToEdgeCoordinates).toEqual([
      [121.0005, endpoint.lat],
      snap.snappedCoordinate,
    ]);
  });
});

describe("routeBuildingToBuilding", () => {
  test("uses graph-only metrics when both building pins are exact graph nodes", () => {
    const result = routeBuildingToBuilding({
      graph: lineGraph,
      origin: building(1, "A", 14, 121),
      destination: building(2, "B", 14, 121.002),
      maxSnapMeters: 100,
    });

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.originSnap.snapMeters).toBeCloseTo(0, 9);
    expect(result.destinationSnap.snapMeters).toBeCloseTo(0, 9);
    expect(result.route.graphMeters).toBeCloseTo(200, 9);
    expect(result.route.totalMeters).toBeCloseTo(200, 9);
    expect(result.route.graphSeconds).toBeCloseTo(200 / WALK_MPS, 9);
    expect(result.route.totalSeconds).toBeCloseTo(200 / WALK_MPS, 9);
  });

  test("starts and ends the mapped route at virtual edge positions", () => {
    const originLat = 14 + 30 / METERS_PER_DEGREE;
    const destinationLat = 14 - 20 / METERS_PER_DEGREE;
    const result = routeBuildingToBuilding({
      graph: lineGraph,
      origin: building(1, "A", originLat, 121.0002),
      destination: building(2, "B", destinationLat, 121.0018),
      maxSnapMeters: 100,
    });

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.originSnap.snapMeters).toBeCloseTo(30, 4);
    expect(result.destinationSnap.snapMeters).toBeCloseTo(20, 4);
    expect(result.route.graphMeters).toBeCloseTo(160, 3);
    expect(result.route.originConnectorMeters).toBeCloseTo(30, 4);
    expect(result.route.destinationConnectorMeters).toBeCloseTo(20, 4);
    expect(result.route.totalMeters).toBeCloseTo(210, 3);
    expect(result.route.totalSeconds).toBeCloseTo(210 / WALK_MPS, 3);
    expect(result.route.graphCoordinates[0]).toEqual(
      result.originSnap.snappedCoordinate,
    );
    expect(result.route.graphCoordinates.at(-1)).toEqual(
      result.destinationSnap.snappedCoordinate,
    );
    expect(result.route.originConnectorCoordinates.at(-1)).toEqual(
      result.route.graphCoordinates[0],
    );
    expect(result.route.destinationConnectorCoordinates[0]).toEqual(
      result.route.graphCoordinates.at(-1),
    );
  });

  test("routes directly between two virtual positions on the same two-way edge", () => {
    const result = routeBuildingToBuilding({
      graph: lineGraph,
      origin: building(1, "A", 14 + 10 / METERS_PER_DEGREE, 121.0002),
      destination: building(2, "B", 14 - 15 / METERS_PER_DEGREE, 121.0008),
      maxSnapMeters: 50,
    });

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.originSnap.edgeIndex).toBe(result.destinationSnap.edgeIndex);
    expect(result.route.graphMeters).toBeCloseTo(60, 3);
    expect(result.route.totalMeters).toBeCloseTo(85, 3);
    expect(result.route.graphCoordinates[0]).toEqual(
      result.originSnap.snappedCoordinate,
    );
    expect(result.route.graphCoordinates.at(-1)).toEqual(
      result.destinationSnap.snappedCoordinate,
    );
  });

  test("different buildings snapped to the same edge position still charge connectors", () => {
    const result = routeBuildingToBuilding({
      graph: lineGraph,
      origin: building(1, "A", 14 - 10 / METERS_PER_DEGREE, 121),
      destination: building(2, "B", 14 + 15 / METERS_PER_DEGREE, 121),
      maxSnapMeters: 50,
    });

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.originSnap.snappedCoordinate).toEqual(
      result.destinationSnap.snappedCoordinate,
    );
    expect(result.route.graphMeters).toBeCloseTo(0, 9);
    expect(result.route.graphSeconds).toBeCloseTo(0, 9);
    expect(result.route.totalMeters).toBeCloseTo(25, 6);
    expect(result.route.totalSeconds).toBeCloseTo(25 / WALK_MPS, 6);
  });

  test("same building is an explicit non-route state keyed by id, not name", () => {
    const same = routeBuildingToBuilding({
      graph: lineGraph,
      origin: building(7, "Old name", null, null),
      destination: building(7, "Renamed building", 14, 121),
      maxSnapMeters: 100,
    });
    expect(same).toMatchObject({
      status: "same-building",
      originBuildingId: 7,
      destinationBuildingId: 7,
      route: null,
    });

    const sameLabelDifferentIds = routeBuildingToBuilding({
      graph: lineGraph,
      origin: building(7, "Shared label", 14, 121),
      destination: building(8, "Shared label", 14, 121.002),
      maxSnapMeters: 100,
    });
    expect(sameLabelDifferentIds.status).toBe("ok");
  });

  test("invalid coordinates fail before edge correlation", () => {
    const badOrigin = routeBuildingToBuilding({
      graph: lineGraph,
      origin: building(1, "A", null, 121),
      destination: building(2, "B", 14, 121.002),
      maxSnapMeters: 100,
    });
    expect(badOrigin.status).toBe("origin-invalid");

    const badDestination = routeBuildingToBuilding({
      graph: lineGraph,
      origin: building(1, "A", 14, 121),
      destination: building(2, "B", 14, Number.NaN),
      maxSnapMeters: 100,
    });
    expect(badDestination.status).toBe("destination-invalid");
  });

  test("snap ceiling is inclusive and fails closed immediately above it", () => {
    const origin = building(1, "A", 14 - 40 / METERS_PER_DEGREE, 121);
    const exactSnapMeters = distanceMeters(
      { lat: origin.lat as number, lon: origin.lon as number },
      { lat: 14, lon: 121 },
    );

    const onBoundary = routeBuildingToBuilding({
      graph: lineGraph,
      origin,
      destination: building(2, "B", 14, 121.002),
      maxSnapMeters: exactSnapMeters,
    });
    expect(onBoundary.status).toBe("ok");

    const overBoundary = routeBuildingToBuilding({
      graph: lineGraph,
      origin,
      destination: building(2, "B", 14, 121.002),
      maxSnapMeters: exactSnapMeters - 0.001,
    });
    expect(overBoundary.status).toBe("origin-off-network");
    if (overBoundary.status === "origin-off-network") {
      expect(overBoundary.originSnap.snapMeters).toBeCloseTo(exactSnapMeters, 9);
      expect(overBoundary.route).toBeNull();
    }
  });

  test("destination off-network preserves origin edge snap but returns no ETA", () => {
    const result = routeBuildingToBuilding({
      graph: lineGraph,
      origin: building(1, "A", 14, 121),
      destination: building(2, "Far B", 14 + 500 / METERS_PER_DEGREE, 121.002),
      maxSnapMeters: 100,
    });

    expect(result.status).toBe("destination-off-network");
    if (result.status !== "destination-off-network") return;
    expect(result.originSnap.edgeIndex).toBe(0);
    expect(result.destinationSnap.snapMeters).toBeGreaterThan(100);
    expect(result.route).toBeNull();
  });

  test("edges outside the largest weak component are off-network even at zero snap", () => {
    const withIsland = buildTravelGraph({
      meta: { coordScale: 1e6, nodeCount: 5, edgeCount: 3 },
      nodes: [
        [1, 14, 121],
        [2, 14, 121.001],
        [3, 14, 121.002],
        [4, 14.01, 121],
        [5, 14.01, 121.001],
      ],
      edges: [
        [0, 1, 100, "footway", null, []],
        [1, 2, 100, "footway", null, []],
        [3, 4, 100, "footway", null, []],
      ],
    });

    expect(Array.from(mainWalkComponentMask(withIsland))).toEqual([
      1, 1, 1, 0, 0,
    ]);
    expect(isMainWalkComponentNode(withIsland, 3)).toBe(false);
    expect(isMainWalkComponentEdge(withIsland, 2)).toBe(false);

    const destinationIsland = routeBuildingToBuilding({
      graph: withIsland,
      origin: building(1, "A", 14, 121),
      destination: building(2, "Island B", 14.01, 121.0005),
      maxSnapMeters: 10,
    });
    expect(destinationIsland.status).toBe("destination-off-network");

    const originIsland = routeBuildingToBuilding({
      graph: withIsland,
      origin: building(2, "Island B", 14.01, 121.0005),
      destination: building(1, "A", 14, 121),
      maxSnapMeters: 10,
    });
    expect(originIsland.status).toBe("origin-off-network");
  });

  test("preserves one-way direction for virtual positions on the same edge", () => {
    const oneWay = buildTravelGraph({
      meta: { coordScale: 1e6, nodeCount: 2, edgeCount: 1 },
      nodes: [
        [1, 14, 121],
        [2, 14, 121.001],
      ],
      edges: [[0, 1, 100, "footway", null, [], 1]],
    });

    const forward = routeBuildingToBuilding({
      graph: oneWay,
      origin: building(1, "A", 14, 121.0002),
      destination: building(2, "B", 14, 121.0008),
      maxSnapMeters: 10,
    });
    expect(forward.status).toBe("ok");
    if (forward.status === "ok") {
      expect(forward.route.graphMeters).toBeCloseTo(60, 3);
    }

    expect(
      routeBuildingToBuilding({
        graph: oneWay,
        origin: building(1, "A", 14, 121.0008),
        destination: building(2, "B", 14, 121.0002),
        maxSnapMeters: 10,
      }).status,
    ).toBe("no-route");
  });

  test("one-way reverse virtual route can use a legitimate return cycle", () => {
    const cycle = buildTravelGraph({
      meta: { coordScale: 1e6, nodeCount: 3, edgeCount: 3 },
      nodes: [
        [1, 14, 121],
        [2, 14, 121.001],
        [3, 14.001, 121.0005],
      ],
      edges: [
        [0, 1, 100, "footway", null, [], 1],
        [1, 2, 100, "footway", null, [], 1],
        [2, 0, 100, "footway", null, [], 1],
      ],
    });
    const result = routeBuildingToBuilding({
      graph: cycle,
      origin: building(1, "A", 14, 121.0008),
      destination: building(2, "B", 14, 121.0002),
      maxSnapMeters: 10,
    });
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.route.graphMeters).toBeCloseTo(240, 3);
    }
  });

  test("rejects an empty travel graph instead of inventing a route", () => {
    const empty = buildTravelGraph({
      meta: { coordScale: 1e6, nodeCount: 0, edgeCount: 0 },
      nodes: [],
      edges: [],
    });

    expect(() =>
      routeBuildingToBuilding({
        graph: empty,
        origin: building(1, "A", 14, 121),
        destination: building(2, "B", 14, 121.001),
        maxSnapMeters: 10,
      }),
    ).toThrow("travel graph has no nodes");
  });

  test("rejects a node-only graph because there is no mapped edge to walk", () => {
    const noEdges = buildTravelGraph({
      meta: { coordScale: 1e6, nodeCount: 1, edgeCount: 0 },
      nodes: [[1, 14, 121]],
      edges: [],
    });
    expect(() =>
      routeBuildingToBuilding({
        graph: noEdges,
        origin: building(1, "A", 14, 121),
        destination: building(2, "B", 14, 121),
        maxSnapMeters: 10,
      }),
    ).toThrow("travel graph has no edges");
  });

  test("rejects malformed graph coordinates instead of snapping through them", () => {
    const malformed: TravelGraph = {
      ...lineGraph,
      lat: new Float64Array([Number.NaN, 14, 14]),
    };

    expect(() =>
      routeBuildingToBuilding({
        graph: malformed,
        origin: building(1, "A", 14, 121),
        destination: building(2, "B", 14, 121.002),
        maxSnapMeters: 10,
      }),
    ).toThrow("invalid coordinates");
  });

  test("rejects invalid policy values instead of silently changing routing policy", () => {
    for (const maxSnapMeters of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() =>
        routeBuildingToBuilding({
          graph: lineGraph,
          origin: building(1, "A", 14, 121),
          destination: building(2, "B", 14, 121.002),
          maxSnapMeters,
        }),
      ).toThrow("maxSnapMeters");
    }
  });

  test("positive very-short routes retain positive exact seconds for UI rounding", () => {
    const result = routeBuildingToBuilding({
      graph: lineGraph,
      origin: building(1, "A", 14 - 1 / METERS_PER_DEGREE, 121),
      destination: building(2, "B", 14 + 1 / METERS_PER_DEGREE, 121),
      maxSnapMeters: 10,
    });
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.route.totalMeters).toBeCloseTo(2, 6);
    expect(result.route.totalSeconds).toBeGreaterThan(0);
    expect(result.route.totalSeconds).toBeLessThan(60);
  });
});
