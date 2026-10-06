import { describe, expect, test } from "bun:test";
import { buildTravelGraph, type WalkGraphData } from "./engine";
import {
  edgeGeometryBetweenSnaps,
  edgeGeometryNodeToSnap,
  edgeGeometrySnapToNode,
  nearestEdgeSnap,
  projectPointToSegmentMeters,
} from "./edge-snap";

const METERS_PER_DEGREE = 111_320;

const straightFixture: WalkGraphData = {
  meta: { coordScale: 1e6, nodeCount: 2, edgeCount: 1 },
  nodes: [
    [1, 14, 121],
    [2, 14, 121.001],
  ],
  edges: [[0, 1, 100, "footway", null, []]],
};
const straight = buildTravelGraph(straightFixture);

describe("projectPointToSegmentMeters", () => {
  test("projects perpendicular points to the segment interior", () => {
    const projection = projectPointToSegmentMeters(
      { lat: 14 + 20 / METERS_PER_DEGREE, lon: 121.0005 },
      [121, 14],
      [121.001, 14],
    );
    expect(projection.segmentFraction).toBeCloseTo(0.5, 4);
    expect(projection.coordinate[0]).toBeCloseTo(121.0005, 8);
    expect(projection.coordinate[1]).toBeCloseTo(14, 8);
    expect(projection.distanceMeters).toBeCloseTo(20, 4);
  });

  test("clamps projections outside the segment to an endpoint", () => {
    const projection = projectPointToSegmentMeters(
      { lat: 14, lon: 120.9995 },
      [121, 14],
      [121.001, 14],
    );
    expect(projection.segmentFraction).toBe(0);
    expect(projection.coordinate).toEqual([121, 14]);
  });

  test("handles zero-length segments deterministically", () => {
    const projection = projectPointToSegmentMeters(
      { lat: 14.001, lon: 121 },
      [121, 14],
      [121, 14],
    );
    expect(projection.segmentFraction).toBe(0);
    expect(projection.coordinate).toEqual([121, 14]);
    expect(projection.distanceMeters).toBeGreaterThan(100);
  });
});

describe("nearestEdgeSnap", () => {
  test("snaps to the middle of an edge instead of a junction node", () => {
    const snap = nearestEdgeSnap(straight, {
      lat: 14 + 20 / METERS_PER_DEGREE,
      lon: 121.0005,
    });
    expect(snap.edgeIndex).toBe(0);
    expect(snap.segmentIndex).toBe(0);
    expect(snap.fractionAlongEdge).toBeCloseTo(0.5, 4);
    expect(snap.snapMeters).toBeCloseTo(20, 4);
    expect(snap.edgeMetersFromU).toBeCloseTo(50, 3);
    expect(snap.edgeMetersToV).toBeCloseTo(50, 3);
  });

  test("preserves curved edge geometry and segment identity", () => {
    const curved = buildTravelGraph({
      meta: { coordScale: 1e6, nodeCount: 2, edgeCount: 1 },
      nodes: [
        [1, 14, 121],
        [2, 14, 121.002],
      ],
      // Interior point = [121.001, 14.001].
      edges: [[0, 1, 250, "footway", null, [1000, 1000]]],
    });
    const snap = nearestEdgeSnap(curved, { lat: 14.0009, lon: 121.0009 });
    expect(snap.edgeIndex).toBe(0);
    expect(snap.segmentIndex).toBe(0);
    expect(snap.snappedCoordinate[0]).toBeGreaterThan(121);
    expect(snap.snappedCoordinate[1]).toBeGreaterThan(14);
  });

  test("keeps the first edge/segment on exact distance ties", () => {
    const tied = buildTravelGraph({
      meta: { coordScale: 1e6, nodeCount: 3, edgeCount: 2 },
      nodes: [
        [1, 14, 121],
        [2, 14, 121.001],
        [3, 14, 120.999],
      ],
      edges: [
        [0, 1, 100, "footway", null, []],
        [0, 2, 100, "footway", null, []],
      ],
    });
    const snap = nearestEdgeSnap(tied, { lat: 14.001, lon: 121 });
    expect(snap.edgeIndex).toBe(0);
  });

  test("ignores a closer disconnected edge in favor of the main weak component", () => {
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

    const snap = nearestEdgeSnap(withIsland, { lat: 14.01, lon: 121.0005 });
    expect(snap.edgeIndex).not.toBe(2);
    expect(snap.edgeIndex).toBeLessThan(2);
    expect(snap.snapMeters).toBeGreaterThan(1000);
  });

  test("rejects non-positive and non-finite graph costs before correlation", () => {
    for (const meters of [Number.NaN, 0, -1]) {
      const malformed = buildTravelGraph({
        meta: { coordScale: 1e6, nodeCount: 2, edgeCount: 1 },
        nodes: [
          [1, 14, 121],
          [2, 14, 121.001],
        ],
        edges: [[0, 1, meters, "footway", null, []]],
      });
      expect(() => nearestEdgeSnap(malformed, { lat: 14, lon: 121 })).toThrow(
        /invalid distance/i,
      );
    }
  });

  test("rejects positive-cost edges with zero decoded geometric length", () => {
    const malformed = buildTravelGraph({
      meta: { coordScale: 1e6, nodeCount: 2, edgeCount: 1 },
      nodes: [
        [1, 14, 121],
        [2, 14, 121],
      ],
      edges: [[0, 1, 100, "footway", null, []]],
    });
    expect(() => nearestEdgeSnap(malformed, { lat: 14, lon: 121 })).toThrow(
      /degenerate geometry/i,
    );
  });

  test("fails when the graph has no edge geometry", () => {
    const noEdges = buildTravelGraph({
      meta: { coordScale: 1e6, nodeCount: 1, edgeCount: 0 },
      nodes: [[1, 14, 121]],
      edges: [],
    });
    expect(() => nearestEdgeSnap(noEdges, { lat: 14, lon: 121 })).toThrow(
      "travel graph has no edges",
    );
  });
});

describe("edge snap geometry slicing", () => {
  test("returns snap-to-node and node-to-snap geometry without gaps", () => {
    const snap = nearestEdgeSnap(straight, { lat: 14, lon: 121.0004 });
    const toU = edgeGeometrySnapToNode(straight, snap, snap.uNodeIndex);
    const fromU = edgeGeometryNodeToSnap(straight, snap, snap.uNodeIndex);
    const toV = edgeGeometrySnapToNode(straight, snap, snap.vNodeIndex);

    expect(toU[0]).toEqual(snap.snappedCoordinate);
    expect(toU.at(-1)).toEqual([121, 14]);
    expect(fromU[0]).toEqual([121, 14]);
    expect(fromU.at(-1)).toEqual(snap.snappedCoordinate);
    expect(toV[0]).toEqual(snap.snappedCoordinate);
    expect(toV.at(-1)).toEqual([121.001, 14]);
  });

  test("slices directly between two positions on the same edge", () => {
    const from = nearestEdgeSnap(straight, { lat: 14, lon: 121.0002 });
    const to = nearestEdgeSnap(straight, { lat: 14, lon: 121.0008 });
    const forward = edgeGeometryBetweenSnaps(straight, from, to);
    const reverse = edgeGeometryBetweenSnaps(straight, to, from);

    expect(forward[0]).toEqual(from.snappedCoordinate);
    expect(forward.at(-1)).toEqual(to.snappedCoordinate);
    expect(reverse).toEqual([...forward].reverse());
  });
});
