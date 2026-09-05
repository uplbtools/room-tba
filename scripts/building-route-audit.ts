/**
 * Audit Room TBA building pins against the vendored walking graph.
 *
 * This is the Pass 0 baseline gate for building-to-building walking directions.
 * It is offline and deterministic by default. Pass `--from-api <deployment>` to
 * audit the deployment's current selectable building rows without mutating the
 * historical checked-in research export.
 *
 * NOTE: this audit intentionally preserves the legacy nearest-junction-node
 * baseline used to establish Room TBA's endpoint ceiling. The runtime building
 * router now correlates to eligible walk-edge geometry; use
 * `building-edge-snap-audit.ts` for the current correlation comparison.
 *
 * Usage:
 *   bun scripts/building-route-audit.ts
 *   bun scripts/building-route-audit.ts --json
 *   bun scripts/building-route-audit.ts --strict
 *   bun scripts/building-route-audit.ts --from-api https://www.uplb.tools
 */

import { readFile } from "node:fs/promises";
import { ENDPOINT_SNAP_TOLERANCE_METERS } from "../src/constants/travel-modes";
import {
  auditBuildingEndpoints,
  type AuditBuilding,
  type AuditWalkGraph,
  type BuildingEndpointAuditReport,
  type DistributionStats,
} from "./lib/building-route-audit";
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

function hasFlag(flag: string): boolean {
  return process.argv.slice(2).includes(flag);
}

function argValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : process.argv[index + 1];
}

function meters(value: number): string {
  return `${value.toFixed(1)} m`;
}

function printStats(label: string, stats: DistributionStats | null): void {
  if (!stats) {
    console.log(`${label}: no values`);
    return;
  }
  console.log(
    `${label}: n=${stats.count} min=${meters(stats.min)} median=${meters(stats.median)} ` +
      `p75=${meters(stats.p75)} p90=${meters(stats.p90)} p95=${meters(stats.p95)} ` +
      `max=${meters(stats.max)} mean=${meters(stats.mean)}`,
  );
}

function printReport(
  report: BuildingEndpointAuditReport,
  input: {
    buildingSource: string;
    buildingSourceSha256: string;
    graphPath: string;
    graphSha256: string;
  },
): void {
  console.log("Room TBA building routing endpoint audit (legacy node baseline)");
  console.log(`building source: ${input.buildingSource}`);
  console.log(`building source sha256: ${input.buildingSourceSha256}`);
  console.log(`graph: ${input.graphPath}`);
  console.log(`graph sha256: ${input.graphSha256}`);
  console.log(
    `graph shape: ${report.graph.nodeCount} nodes, ${report.graph.edgeCount} edges, ` +
      `${report.graph.componentCount} components; main component ${report.graph.mainComponentSize} nodes`,
  );
  if (report.graph.source) console.log(`graph source: ${report.graph.source}`);
  if (report.graph.generated) console.log(`graph generated: ${report.graph.generated}`);
  console.log(
    `buildings: ${report.summary.buildingCount} total; ${report.summary.supportedCount} supported, ` +
      `${report.summary.reviewCount} review, ${report.summary.unsupportedCount} unsupported, ` +
      `${report.summary.invalidCoordinateCount} invalid coordinates`,
  );
  console.log(
    `policy: hard snap ceiling ${meters(report.policy.hardSnapLimitMeters)}; ` +
      `review above ${meters(report.policy.reviewSnapThresholdMeters)} ` +
      `(${report.policy.reviewThresholdBasis}); nearest node must be in the largest graph component`,
  );
  printStats("all valid snap distances", report.snapDistribution);
  printStats("eligible baseline snap distances", report.eligibleSnapDistribution);

  console.log("\nWorst / actionable endpoints:");
  const actionable = report.buildings.filter(
    (row) => row.status !== "supported",
  );
  if (actionable.length === 0) {
    console.log("  none");
  } else {
    for (const row of actionable) {
      console.log(
        `  [${row.status}] ${row.buildingName} — ` +
          `${row.snapMeters === null ? "invalid coordinate" : meters(row.snapMeters)} — ${row.reason}`,
      );
    }
  }

  console.log("\nAll buildings (worst snap first):");
  for (const row of report.buildings) {
    console.log(
      `  ${row.buildingName}\t${row.status}\t` +
        `${row.snapMeters === null ? "n/a" : meters(row.snapMeters)}\t` +
        `${row.osmId ?? "n/a"}`,
    );
  }
}

const apiBase = argValue("--from-api");
const buildingSource = apiBase
  ? `live API (${buildingApiUrl(apiBase)})`
  : BUILDINGS_PATH;
const [buildings, graphText] = await Promise.all([
  apiBase
    ? fetchBuildingRouteApiRows(apiBase)
    : readFile(BUILDINGS_PATH, "utf8").then(
        (text) => JSON.parse(text) as AuditBuilding[],
      ),
  readFile(GRAPH_PATH, "utf8"),
]);
const graph = JSON.parse(graphText) as AuditWalkGraph;
const input = {
  buildingSource,
  buildingSourceSha256: buildingRouteSourceSha256(buildings),
  graphPath: GRAPH_PATH,
  graphSha256: sha256Text(graphText),
};

const report = auditBuildingEndpoints(buildings, graph, {
  // Reuse Room TBA's existing endpoint honesty ceiling. The audit derives a
  // stricter *review* threshold from this building dataset rather than copying
  // UPPETITE's place-specific 40/100 m thresholds.
  hardSnapLimitMeters: ENDPOINT_SNAP_TOLERANCE_METERS,
});

if (hasFlag("--json")) {
  console.log(JSON.stringify({ input, ...report }, null, 2));
} else {
  printReport(report, input);
}

if (
  hasFlag("--strict") &&
  (report.summary.invalidCoordinateCount > 0 ||
    report.summary.unsupportedCount > 0)
) {
  process.exitCode = 1;
}
