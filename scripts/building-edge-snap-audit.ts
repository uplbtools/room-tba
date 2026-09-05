/**
 * Compare the legacy nearest-node building connector with current edge
 * correlation.
 *
 * Uses the historical checked-in building fixture by default. Pass
 * `--from-api <deployment>` to compare current selectable building records
 * without guessing or backfilling coordinates into that fixture.
 *
 * Usage:
 *   bun scripts/building-edge-snap-audit.ts
 *   bun scripts/building-edge-snap-audit.ts --json
 *   bun scripts/building-edge-snap-audit.ts --from-api https://www.uplb.tools
 */

import { readFile } from "node:fs/promises";
import { ENDPOINT_SNAP_TOLERANCE_METERS } from "../src/constants/travel-modes";
import { distanceMeters } from "../src/lib/campus-route";
import {
  buildTravelGraph,
  nearestNodeIndex,
  type WalkGraphData,
} from "../src/lib/travel-graph/engine";
import {
  isMainWalkComponentEdge,
  isMainWalkComponentNode,
  snapBuildingEndpoint,
  type BuildingRouteEndpoint,
} from "../src/lib/travel-graph/building-route";
import {
  buildingApiUrl,
  fetchBuildingRouteApiRows,
} from "./lib/building-route-api-source";
import {
  buildingRouteSourceSha256,
  sha256Text,
} from "./lib/building-route-audit-provenance";

const BUILDINGS_PATH = "exports/deep-research/buildings.json";
const GRAPH_PATH = "src/generated/walk-graph.json";

function argValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : process.argv[index + 1];
}

const apiBase = argValue("--from-api");
const [buildings, graphText] = await Promise.all([
  apiBase
    ? fetchBuildingRouteApiRows(apiBase)
    : readFile(BUILDINGS_PATH, "utf8").then(
        (text) => JSON.parse(text) as BuildingRouteEndpoint[],
      ),
  readFile(GRAPH_PATH, "utf8"),
]);
const buildingSource = apiBase
  ? `live API (${buildingApiUrl(apiBase)})`
  : BUILDINGS_PATH;
const walkGraphJson = JSON.parse(graphText) as WalkGraphData;
const graph = buildTravelGraph(walkGraphJson);
const input = {
  buildingSource,
  buildingSourceSha256: buildingRouteSourceSha256(buildings),
  graphPath: GRAPH_PATH,
  graphSha256: sha256Text(graphText),
};

function percentile(values: number[], p: number): number {
  if (values.length === 0) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * p;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  const fraction = position - lower;
  return (
    (sorted[lower] as number) * (1 - fraction) +
    (sorted[upper] as number) * fraction
  );
}

function distribution(values: number[]) {
  return {
    count: values.length,
    median: percentile(values, 0.5),
    p90: percentile(values, 0.9),
    p95: percentile(values, 0.95),
    max: values.length > 0 ? Math.max(...values) : Number.NaN,
  };
}

const rows = buildings.flatMap((building) => {
  if (building.lat === null || building.lon === null) return [];
  const nodeIndex = nearestNodeIndex(graph, building.lat, building.lon, "walk");
  const nodeSnapMeters = distanceMeters(
    { lat: building.lat, lon: building.lon },
    {
      lat: graph.lat[nodeIndex] as number,
      lon: graph.lng[nodeIndex] as number,
    },
  );
  const edgeSnap = snapBuildingEndpoint(graph, {
    ...building,
    lat: building.lat,
    lon: building.lon,
  });
  const oldSupported =
    nodeSnapMeters <= ENDPOINT_SNAP_TOLERANCE_METERS &&
    isMainWalkComponentNode(graph, nodeIndex);
  const newSupported =
    edgeSnap.snapMeters <= ENDPOINT_SNAP_TOLERANCE_METERS &&
    isMainWalkComponentEdge(graph, edgeSnap.edgeIndex);

  return [
    {
      buildingId: building.id,
      buildingName: building.buildingName,
      nodeIndex,
      edgeIndex: edgeSnap.edgeIndex,
      nodeSnapMeters,
      edgeSnapMeters: edgeSnap.snapMeters,
      improvementMeters: nodeSnapMeters - edgeSnap.snapMeters,
      improvementPercent:
        nodeSnapMeters > 0
          ? ((nodeSnapMeters - edgeSnap.snapMeters) / nodeSnapMeters) * 100
          : 0,
      oldSupported,
      newSupported,
      supportChanged: oldSupported !== newSupported,
      snappedCoordinate: edgeSnap.snappedCoordinate,
    },
  ];
});

const nodeDistances = rows.map((row) => row.nodeSnapMeters);
const edgeDistances = rows.map((row) => row.edgeSnapMeters);
const improvements = rows.map((row) => row.improvementMeters);
const report = {
  input,
  policy: {
    hardSnapLimitMeters: ENDPOINT_SNAP_TOLERANCE_METERS,
    connectivity: "largest-weak-component",
  },
  summary: {
    buildingCount: buildings.length,
    comparableCount: rows.length,
    skippedNullCoordinateCount: buildings.length - rows.length,
    strictlyImprovedCount: rows.filter((row) => row.improvementMeters > 0.5)
      .length,
    supportChangedCount: rows.filter((row) => row.supportChanged).length,
    oldSupportedCount: rows.filter((row) => row.oldSupported).length,
    newSupportedCount: rows.filter((row) => row.newSupported).length,
  },
  nodeSnapDistribution: distribution(nodeDistances),
  edgeSnapDistribution: distribution(edgeDistances),
  improvementDistribution: distribution(improvements),
  rows: [...rows].sort(
    (a, b) =>
      b.improvementMeters - a.improvementMeters ||
      a.buildingName.localeCompare(b.buildingName),
  ),
};

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(report, null, 2));
} else {
  const fmt = (value: number) => `${value.toFixed(1)} m`;
  console.log("Room TBA building connector edge-snap audit");
  console.log(`building source: ${input.buildingSource}`);
  console.log(`building source sha256: ${input.buildingSourceSha256}`);
  console.log(`graph: ${input.graphPath}`);
  console.log(`graph sha256: ${input.graphSha256}`);
  console.log(
    `buildings: ${report.summary.buildingCount}; comparable=${report.summary.comparableCount}; ` +
      `null coordinates=${report.summary.skippedNullCoordinateCount}; ` +
      `strictly improved=${report.summary.strictlyImprovedCount}; support changes=${report.summary.supportChangedCount}`,
  );
  if (rows.length > 0) {
    console.log(
      `nearest node: median=${fmt(report.nodeSnapDistribution.median)} p90=${fmt(report.nodeSnapDistribution.p90)} ` +
        `p95=${fmt(report.nodeSnapDistribution.p95)} max=${fmt(report.nodeSnapDistribution.max)}`,
    );
    console.log(
      `nearest edge: median=${fmt(report.edgeSnapDistribution.median)} p90=${fmt(report.edgeSnapDistribution.p90)} ` +
        `p95=${fmt(report.edgeSnapDistribution.p95)} max=${fmt(report.edgeSnapDistribution.max)}`,
    );
  } else {
    console.log("no comparable building coordinates");
  }
  console.log("\nLargest connector improvements:");
  for (const row of report.rows.slice(0, 12)) {
    console.log(
      `  ${row.buildingName}: ${fmt(row.nodeSnapMeters)} -> ${fmt(row.edgeSnapMeters)} ` +
        `(-${fmt(row.improvementMeters)}, ${row.improvementPercent.toFixed(0)}%)`,
    );
  }
  const changed = report.rows.filter((row) => row.supportChanged);
  if (changed.length > 0) {
    console.log("\nEndpoint support changes:");
    for (const row of changed) {
      console.log(
        `  ${row.buildingName}: ${row.oldSupported ? "supported" : "unsupported"} -> ` +
          `${row.newSupported ? "supported" : "unsupported"}`,
      );
    }
  }
}
