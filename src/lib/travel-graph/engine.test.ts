import { describe, expect, test } from "bun:test";
import walkGraphJson from "../../generated/walk-graph.json";
import { distanceMeters } from "../campus-route";
import {
  buildTravelGraph,
  dijkstra,
  edgeCoordinates,
  edgeSeconds,
  isochroneFeatures,
  nearestNodeIndex,
  shortestPath,
  type WalkGraphData,
} from "./engine";

/**
 * Synthetic square:
 *
 *   1 --e2(service 40)-- 3
 *   |                  / |
 *  e0(footway)  e4(service, one-way 0->3, 50m)
 *   |              /     |
 *   0 --e1(steps)------- 2 --e3(service 20)-- 3
 */
const fixture: WalkGraphData = {
  meta: { coordScale: 1e6, nodeCount: 4, edgeCount: 5 },
  nodes: [
    [1, 14.16, 121.24],
    [2, 14.161, 121.24],
    [3, 14.16, 121.241],
    [4, 14.161, 121.241],
  ],
  edges: [
    [0, 1, 100, "footway", null, [50, 50]],
    [0, 2, 100, "steps;footway", null, []],
    [1, 3, 100, "service", 40, []],
    [2, 3, 100, "service", 20, []],
    [0, 3, 50, "service", null, [], 1],
  ],
};
const graph = buildTravelGraph(fixture);

describe("buildTravelGraph", () => {
  test("collapsed edges are traversable both ways, one-way edges only forward", () => {
    expect(graph.adjacency[0].map((h) => h.edge).sort()).toEqual([0, 1, 4]);
    // Node 3 gets reverse half-edges for e2/e3 but not the one-way e4.
    expect(graph.adjacency[3].map((h) => h.edge).sort()).toEqual([2, 3]);
  });
});

describe("edgeSeconds", () => {
  test("walk covers every edge at 4.5 km/h", () => {
    expect(edgeSeconds(fixture.edges[0], "walk")).toBeCloseTo(80);
    expect(edgeSeconds(fixture.edges[1], "walk")).toBeCloseTo(80);
  });

  test("cycle skips steps and rides at 15 km/h", () => {
    expect(edgeSeconds(fixture.edges[1], "cycle")).toBeNull();
    expect(edgeSeconds(fixture.edges[0], "cycle")).toBeCloseTo(24);
  });

  test("drive is road-only with maxspeed capped at 30 km/h", () => {
    expect(edgeSeconds(fixture.edges[0], "drive")).toBeNull();
    expect(edgeSeconds(fixture.edges[1], "drive")).toBeNull();
    // Tagged 40 gets the campus cap; tagged 20 keeps its own limit.
    expect(edgeSeconds(fixture.edges[2], "drive")).toBeCloseTo(12);
    expect(edgeSeconds(fixture.edges[3], "drive")).toBeCloseTo(18);
    // Untagged road defaults to the cap.
    expect(edgeSeconds(fixture.edges[4], "drive")).toBeCloseTo(6);
  });
});

describe("dijkstra + shortestPath", () => {
  test("walk takes the short one-way shortcut", () => {
    const route = shortestPath(graph, 0, 3, "walk");
    expect(route?.meters).toBe(50);
    expect(route?.seconds).toBeCloseTo(40);
    expect(route?.coordinates[0]).toEqual([121.24, 14.16]);
    expect(route?.coordinates.at(-1)).toEqual([121.241, 14.161]);
  });

  test("one-way edge is not traversable backwards", () => {
    // Reverse direction must detour 3 -> (1 or 2) -> 0 over 200 m.
    const route = shortestPath(graph, 3, 0, "walk");
    expect(route?.meters).toBe(200);
  });

  test("cycle detours around steps", () => {
    const route = shortestPath(graph, 3, 2, "cycle");
    expect(route?.meters).toBe(100);
    const stepsRoute = shortestPath(graph, 1, 0, "cycle");
    expect(stepsRoute?.meters).toBe(100); // footway back down, never e1
  });

  test("drive has no route when only footpaths connect", () => {
    expect(shortestPath(graph, 3, 0, "drive")).toBeNull();
    expect(shortestPath(graph, 0, 1, "drive")).not.toBeNull(); // via e4 + e2
  });

  test("zero-length route for identical endpoints", () => {
    expect(shortestPath(graph, 2, 2, "walk")).toEqual({
      seconds: 0,
      meters: 0,
      coordinates: [[121.241, 14.16]],
    });
  });
});

describe("edgeCoordinates", () => {
  test("decodes interior delta points between node endpoints", () => {
    expect(edgeCoordinates(graph, 0)).toEqual([
      [121.24, 14.16],
      [121.24005, 14.16005],
      [121.24, 14.161],
    ]);
  });

  test("path geometry flips reverse-traversed edges into travel order", () => {
    const route = shortestPath(graph, 1, 0, "walk");
    expect(route?.coordinates).toEqual([
      [121.24, 14.161],
      [121.24005, 14.16005],
      [121.24, 14.16],
    ]);
  });
});

describe("nearestNodeIndex", () => {
  test("snaps to the closest node", () => {
    expect(nearestNodeIndex(graph, 14.1601, 121.24005)).toBe(0);
    expect(nearestNodeIndex(graph, 14.1612, 121.2411)).toBe(3);
  });
});

describe("isochroneFeatures", () => {
  test("every reachable edge carries mean minutes", () => {
    const { seconds } = dijkstra(graph, 0, "walk");
    const collection = isochroneFeatures(graph, seconds);
    expect(collection.features).toHaveLength(5);
    const shortcut = collection.features[4];
    expect(shortcut.properties.minutes).toBeCloseTo(0.3);
  });

  test("unreachable edges are dropped", () => {
    // Driving from node 1 cannot reach node 0 (its only road link is the
    // one-way e4 pointing 0 -> 3), so all three edges touching 0 drop out.
    const { seconds } = dijkstra(graph, 1, "drive");
    const collection = isochroneFeatures(graph, seconds);
    expect(collection.features).toHaveLength(2);
  });
});

describe("real campus graph", () => {
  const campus = buildTravelGraph(walkGraphJson as unknown as WalkGraphData);

  test("matches the converter's recorded counts", () => {
    expect(campus.lat.length).toBe(walkGraphJson.meta.nodeCount);
    expect(campus.edges.length).toBe(walkGraphJson.meta.edgeCount);
  });

  test("walking reaches the whole network (source graph is one component)", () => {
    const { seconds } = dijkstra(campus, 0, "walk");
    expect(seconds.every(Number.isFinite)).toBe(true);
  });

  test("a cross-campus walk is sane: longer than the crow flies, correct speed", () => {
    // Oblation area to CAS area — well-known campus walk.
    const from = nearestNodeIndex(campus, 14.167, 121.2435);
    const to = nearestNodeIndex(campus, 14.1655, 121.2412);
    const route = shortestPath(campus, from, to, "walk");
    expect(route).not.toBeNull();
    const straightLine = distanceMeters(
      { lat: campus.lat[from], lon: campus.lng[from] },
      { lat: campus.lat[to], lon: campus.lng[to] },
    );
    const routed = route as NonNullable<typeof route>;
    expect(routed.meters).toBeGreaterThanOrEqual(straightLine * 0.99);
    expect(routed.meters).toBeLessThan(straightLine * 3);
    // Time follows directly from the walk speed constant.
    expect(routed.seconds).toBeCloseTo(routed.meters / (4.5 / 3.6), 3);
  });
});
