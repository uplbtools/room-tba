import { describe, expect, test } from "bun:test";
import {
  auditBuildingEndpoints,
  distributionStats,
  graphComponents,
  isFiniteCoordinate,
  nearestGraphNode,
  percentile,
  type AuditWalkGraph,
} from "./building-route-audit";

const lineGraph: AuditWalkGraph = {
  meta: { source: "fixture.graphml", generated: "2026-09-04" },
  nodes: [
    [100, 14, 121],
    [101, 14, 121.001],
    [102, 14, 121.002],
  ],
  edges: [
    [0, 1, 100],
    [1, 2, 100],
  ],
};

describe("building-route-audit", () => {
  test("validates finite geographic coordinates", () => {
    expect(isFiniteCoordinate(14.16, 121.24)).toBe(true);
    expect(isFiniteCoordinate(null, 121.24)).toBe(false);
    expect(isFiniteCoordinate(91, 121.24)).toBe(false);
    expect(isFiniteCoordinate(14.16, Number.NaN)).toBe(false);
  });

  test("uses interpolated percentiles and stable distribution stats", () => {
    const sorted = [0, 10, 20, 30, 40];
    expect(percentile(sorted, 0.5)).toBe(20);
    expect(percentile(sorted, 0.9)).toBeCloseTo(36);
    const stats = distributionStats(sorted);
    expect(stats?.median).toBe(20);
    expect(stats?.q1).toBe(10);
    expect(stats?.q3).toBe(30);
    expect(stats?.tukeyUpperFence).toBe(60);
  });

  test("finds the nearest graph node", () => {
    const nearest = nearestGraphNode(lineGraph, { lat: 14, lon: 121.00105 });
    expect(nearest.nodeIndex).toBe(1);
    expect(nearest.snapMeters).toBeLessThan(10);
  });

  test("finds graph components and chooses the largest", () => {
    const graph: AuditWalkGraph = {
      nodes: [
        [1, 14, 121],
        [2, 14, 121.001],
        [3, 14, 121.002],
        [4, 15, 122],
      ],
      edges: [
        [0, 1],
        [1, 2],
      ],
    };
    const components = graphComponents(graph);
    expect(components.sizeByComponent.size).toBe(2);
    expect(components.mainComponentSize).toBe(3);
    expect(components.componentByNode[0]).toBe(components.mainComponentId);
    expect(components.componentByNode[3]).not.toBe(components.mainComponentId);
  });

  test("fails closed beyond the hard snap ceiling", () => {
    const report = auditBuildingEndpoints(
      [{ id: 1, buildingName: "Far Hall", lat: 14.01, lon: 121 }],
      lineGraph,
      { hardSnapLimitMeters: 100 },
    );
    expect(report.buildings[0].status).toBe("unsupported");
    expect(report.buildings[0].reason).toBe("snap-distance-over-hard-limit");
  });

  test("fails closed when the nearest node is outside the main component", () => {
    const graph: AuditWalkGraph = {
      nodes: [
        [1, 14, 121],
        [2, 14, 121.001],
        [3, 14, 121.002],
        [4, 14.01, 121],
      ],
      edges: [
        [0, 1],
        [1, 2],
      ],
    };
    const report = auditBuildingEndpoints(
      [{ id: 1, buildingName: "Island Hall", lat: 14.01, lon: 121 }],
      graph,
      { hardSnapLimitMeters: 250 },
    );
    expect(report.buildings[0].status).toBe("unsupported");
    expect(report.buildings[0].reason).toBe("outside-main-component");
  });

  test("keeps invalid building coordinates explicit", () => {
    const report = auditBuildingEndpoints(
      [{ id: 7, buildingName: "Bad Hall", lat: null, lon: 121 }],
      lineGraph,
      { hardSnapLimitMeters: 250 },
    );
    expect(report.summary.invalidCoordinateCount).toBe(1);
    expect(report.buildings[0]).toMatchObject({
      status: "invalid-coordinate",
      reason: "invalid-coordinate",
      nodeIndex: null,
      snapMeters: null,
    });
  });

  test("derives review status from this dataset instead of a copied threshold", () => {
    const graph: AuditWalkGraph = {
      nodes: [[1, 14, 121]],
      edges: [],
    };
    const buildings = [0, 1, 2, 3, 30].map((offset, index) => ({
      id: index + 1,
      buildingName: `Hall ${index + 1}`,
      lat: 14,
      lon: 121 + offset / 111_320,
    }));
    const report = auditBuildingEndpoints(buildings, graph, {
      hardSnapLimitMeters: 250,
    });
    expect(report.policy.reviewThresholdBasis).toBe("p95-or-tukey-upper-fence");
    expect(report.buildings.some((row) => row.status === "review")).toBe(true);
    expect(report.summary.unsupportedCount).toBe(0);
  });

  test("rejects malformed graph references", () => {
    expect(() =>
      graphComponents({
        nodes: [[1, 14, 121]],
        edges: [[0, 99]],
      }),
    ).toThrow("edge 0 references an invalid node");
  });
});
