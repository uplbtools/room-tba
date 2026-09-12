import { describe, expect, test } from "bun:test";
import { buildTravelGraph, type TravelGraph } from "./engine";
import { nearestEdgeSnap } from "./edge-snap";
import {
  routeBuildingToBuilding,
  type BuildingRouteEndpoint,
} from "./building-route";

function building(id: number, lon: number): BuildingRouteEndpoint {
  return { id, buildingName: `Building ${id}`, lat: 14, lon };
}

function simpleGraph() {
  return buildTravelGraph({
    meta: { coordScale: 1e6, nodeCount: 2, edgeCount: 1 },
    nodes: [
      [1, 14, 121],
      [2, 14, 121.001],
    ],
    edges: [[0, 1, 100, "footway", null, []]],
  });
}

describe("building route structural fail-closed guards", () => {
  test("rejects non-finite, zero, and negative edge distances", () => {
    for (const meters of [Number.NaN, 0, -1]) {
      const graph = buildTravelGraph({
        meta: { coordScale: 1e6, nodeCount: 2, edgeCount: 1 },
        nodes: [
          [1, 14, 121],
          [2, 14, 121.001],
        ],
        edges: [[0, 1, meters, "footway", null, []]],
      });

      expect(() =>
        routeBuildingToBuilding({
          graph,
          origin: building(1, 121),
          destination: building(2, 121.001),
          maxSnapMeters: 10,
        }),
      ).toThrow(/invalid distance/i);
    }
  });

  test("accepts canonical undirected self-loops with paired adjacency halves", () => {
    const graph = buildTravelGraph({
      meta: { coordScale: 1e6, nodeCount: 2, edgeCount: 2 },
      nodes: [
        [1, 14, 121],
        [2, 14, 121.001],
      ],
      edges: [
        [0, 0, 30, "footway", null, [100, 100]],
        [0, 1, 100, "footway", null, []],
      ],
    });

    const result = routeBuildingToBuilding({
      graph,
      origin: building(1, 121),
      destination: building(2, 121.001),
      maxSnapMeters: 10,
    });

    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.route.totalMeters).toBeCloseTo(100, 6);
    }
  });

  test("rejects invalid coordinate scale before decoding edge geometry", () => {
    const graph: TravelGraph = { ...simpleGraph(), coordScale: 0 };
    expect(() => nearestEdgeSnap(graph, { lat: 14, lon: 121 })).toThrow(
      /coordScale/i,
    );
  });

  test("rejects malformed encoded edge geometry", () => {
    const graph = buildTravelGraph({
      meta: { coordScale: 1e6, nodeCount: 2, edgeCount: 1 },
      nodes: [
        [1, 14, 121],
        [2, 14, 121.001],
      ],
      edges: [[0, 1, 100, "footway", null, [5]]],
    });
    expect(() => nearestEdgeSnap(graph, { lat: 14, lon: 121 })).toThrow(
      /geometry deltas/i,
    );
  });

  test("rejects incomplete adjacency before Dijkstra", () => {
    const base = simpleGraph();
    const graph: TravelGraph = { ...base, adjacency: [[], []] };
    expect(() =>
      routeBuildingToBuilding({
        graph,
        origin: building(1, 121),
        destination: building(2, 121.001),
        maxSnapMeters: 10,
      }),
    ).toThrow(/adjacency is incomplete/i);
  });

  test("rejects adjacency that contradicts stored edge endpoints", () => {
    const base = simpleGraph();
    const graph: TravelGraph = {
      ...base,
      adjacency: [[{ edge: 0, to: 0 }], [{ edge: 0, to: 0 }]],
    };
    expect(() =>
      routeBuildingToBuilding({
        graph,
        origin: building(1, 121),
        destination: building(2, 121.001),
        maxSnapMeters: 10,
      }),
    ).toThrow(/adjacency is inconsistent/i);
  });
});
