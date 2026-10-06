import { distanceMeters } from "../../src/lib/campus-route";

export type AuditBuilding = {
  id: number;
  buildingName: string;
  lat: number | null;
  lon: number | null;
};

export type AuditWalkGraph = {
  meta?: {
    source?: string;
    generated?: string;
    nodeCount?: number;
    edgeCount?: number;
    [key: string]: unknown;
  };
  /** [osmId, lat, lon] */
  nodes: [number | string, number, number][];
  /** Only the first two fields are needed for connectivity. */
  edges: [number, number, ...unknown[]][];
};

export type BuildingEndpointStatus =
  | "supported"
  | "review"
  | "unsupported"
  | "invalid-coordinate";

export type BuildingEndpointAuditRow = {
  buildingId: number;
  buildingName: string;
  lat: number | null;
  lon: number | null;
  status: BuildingEndpointStatus;
  reason:
    | "within-baseline"
    | "snap-distance-outlier"
    | "snap-distance-over-hard-limit"
    | "outside-main-component"
    | "invalid-coordinate";
  nodeIndex: number | null;
  osmId: number | string | null;
  nodeLat: number | null;
  nodeLon: number | null;
  snapMeters: number | null;
  componentId: number | null;
  componentSize: number | null;
};

export type DistributionStats = {
  count: number;
  min: number;
  mean: number;
  median: number;
  p75: number;
  p90: number;
  p95: number;
  max: number;
  q1: number;
  q3: number;
  iqr: number;
  tukeyUpperFence: number;
};

export type BuildingEndpointAuditReport = {
  policy: {
    hardSnapLimitMeters: number;
    reviewSnapThresholdMeters: number;
    reviewThresholdBasis: "p95-or-tukey-upper-fence" | "hard-limit-fallback";
    connectivityRule: "nearest-node-must-be-in-largest-component";
  };
  graph: {
    source: string | null;
    generated: string | null;
    nodeCount: number;
    edgeCount: number;
    componentCount: number;
    mainComponentId: number;
    mainComponentSize: number;
  };
  summary: {
    buildingCount: number;
    validCoordinateCount: number;
    invalidCoordinateCount: number;
    supportedCount: number;
    reviewCount: number;
    unsupportedCount: number;
  };
  snapDistribution: DistributionStats | null;
  eligibleSnapDistribution: DistributionStats | null;
  buildings: BuildingEndpointAuditRow[];
};

export type BuildingEndpointAuditOptions = {
  /** Absolute fail-closed ceiling. Defaults are supplied by the CLI. */
  hardSnapLimitMeters: number;
};

function assertGraph(graph: AuditWalkGraph): void {
  if (!Array.isArray(graph.nodes) || graph.nodes.length === 0) {
    throw new Error("building route audit: walk graph has no nodes");
  }
  if (!Array.isArray(graph.edges)) {
    throw new Error("building route audit: walk graph edges are missing");
  }
  for (let i = 0; i < graph.nodes.length; i++) {
    const node = graph.nodes[i];
    if (!node) {
      throw new Error(`building route audit: graph node ${i} is missing`);
    }
    const [, lat, lon] = node;
    if (!isFiniteCoordinate(lat, lon)) {
      throw new Error(
        `building route audit: graph node ${i} has invalid coordinates`,
      );
    }
  }
}

export function isFiniteCoordinate(
  lat: number | null | undefined,
  lon: number | null | undefined,
): boolean {
  return (
    typeof lat === "number" &&
    typeof lon === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}

export function percentile(sortedValues: number[], p: number): number {
  if (sortedValues.length === 0) {
    throw new Error("percentile requires at least one value");
  }
  if (p < 0 || p > 1) throw new Error("percentile p must be between 0 and 1");
  if (sortedValues.length === 1) return sortedValues[0] as number;

  const position = (sortedValues.length - 1) * p;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sortedValues[lower] as number;
  const fraction = position - lower;
  return (
    (sortedValues[lower] as number) * (1 - fraction) +
    (sortedValues[upper] as number) * fraction
  );
}

export function distributionStats(values: number[]): DistributionStats | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = percentile(sorted, 0.25);
  const q3 = percentile(sorted, 0.75);
  const iqr = q3 - q1;
  return {
    count: sorted.length,
    min: sorted[0] as number,
    mean: sorted.reduce((sum, value) => sum + value, 0) / sorted.length,
    median: percentile(sorted, 0.5),
    p75: q3,
    p90: percentile(sorted, 0.9),
    p95: percentile(sorted, 0.95),
    max: sorted.at(-1) as number,
    q1,
    q3,
    iqr,
    tukeyUpperFence: q3 + 1.5 * iqr,
  };
}

type Components = {
  componentByNode: Int32Array;
  sizeByComponent: Map<number, number>;
  mainComponentId: number;
  mainComponentSize: number;
};

export function graphComponents(graph: AuditWalkGraph): Components {
  assertGraph(graph);
  const parent = new Int32Array(graph.nodes.length);
  const rank = new Uint8Array(graph.nodes.length);
  for (let i = 0; i < parent.length; i++) parent[i] = i;

  const find = (node: number): number => {
    let root = node;
    while ((parent[root] as number) !== root) {
      root = parent[root] as number;
    }
    while ((parent[node] as number) !== node) {
      const next = parent[node] as number;
      parent[node] = root;
      node = next;
    }
    return root;
  };

  const union = (a: number, b: number) => {
    let rootA = find(a);
    let rootB = find(b);
    if (rootA === rootB) return;
    if ((rank[rootA] as number) < (rank[rootB] as number)) {
      [rootA, rootB] = [rootB, rootA];
    }
    parent[rootB] = rootA;
    if ((rank[rootA] as number) === (rank[rootB] as number)) {
      rank[rootA] = (rank[rootA] as number) + 1;
    }
  };

  for (let edgeIndex = 0; edgeIndex < graph.edges.length; edgeIndex++) {
    const edge = graph.edges[edgeIndex];
    const u = edge?.[0];
    const v = edge?.[1];
    if (
      typeof u !== "number" ||
      typeof v !== "number" ||
      !Number.isInteger(u) ||
      !Number.isInteger(v) ||
      u < 0 ||
      v < 0 ||
      u >= graph.nodes.length ||
      v >= graph.nodes.length
    ) {
      throw new Error(
        `building route audit: edge ${edgeIndex} references an invalid node`,
      );
    }
    union(u, v);
  }

  const rootToComponent = new Map<number, number>();
  const sizeByComponent = new Map<number, number>();
  const componentByNode = new Int32Array(graph.nodes.length);
  let nextComponent = 0;
  for (let node = 0; node < graph.nodes.length; node++) {
    const root = find(node);
    let componentId = rootToComponent.get(root);
    if (componentId === undefined) {
      componentId = nextComponent++;
      rootToComponent.set(root, componentId);
    }
    componentByNode[node] = componentId;
    sizeByComponent.set(
      componentId,
      (sizeByComponent.get(componentId) ?? 0) + 1,
    );
  }

  let mainComponentId = 0;
  let mainComponentSize = -1;
  for (const [componentId, size] of sizeByComponent) {
    if (size > mainComponentSize) {
      mainComponentId = componentId;
      mainComponentSize = size;
    }
  }

  return {
    componentByNode,
    sizeByComponent,
    mainComponentId,
    mainComponentSize,
  };
}

function nearestGraphNodeUnchecked(
  graph: AuditWalkGraph,
  point: { lat: number; lon: number },
): { nodeIndex: number; snapMeters: number } {
  let bestIndex = 0;
  let bestMeters = Number.POSITIVE_INFINITY;
  for (let nodeIndex = 0; nodeIndex < graph.nodes.length; nodeIndex++) {
    const node = graph.nodes[nodeIndex];
    if (!node) {
      throw new Error(
        `building route audit: graph node ${nodeIndex} is missing`,
      );
    }
    const [, lat, lon] = node;
    const meters = distanceMeters(point, { lat, lon });
    if (meters < bestMeters) {
      bestMeters = meters;
      bestIndex = nodeIndex;
    }
  }
  return { nodeIndex: bestIndex, snapMeters: bestMeters };
}

export function nearestGraphNode(
  graph: AuditWalkGraph,
  point: { lat: number; lon: number },
): { nodeIndex: number; snapMeters: number } {
  assertGraph(graph);
  return nearestGraphNodeUnchecked(graph, point);
}

function roundMeters(value: number): number {
  return Math.round(value * 100) / 100;
}

function deriveReviewThreshold(
  eligible: number[],
  hardSnapLimitMeters: number,
): {
  threshold: number;
  basis: BuildingEndpointAuditReport["policy"]["reviewThresholdBasis"];
} {
  const stats = distributionStats(eligible);
  if (!stats || stats.count < 4) {
    return { threshold: hardSnapLimitMeters, basis: "hard-limit-fallback" };
  }
  // Review is advisory: flag the long tail without turning a copied threshold
  // from another project into a routing rule. Hard failure remains the explicit
  // Room TBA endpoint ceiling supplied by the caller.
  return {
    threshold: Math.min(
      hardSnapLimitMeters,
      Math.max(stats.p95, stats.tukeyUpperFence),
    ),
    basis: "p95-or-tukey-upper-fence",
  };
}

export function auditBuildingEndpoints(
  buildings: AuditBuilding[],
  graph: AuditWalkGraph,
  options: BuildingEndpointAuditOptions,
): BuildingEndpointAuditReport {
  assertGraph(graph);
  if (
    !Number.isFinite(options.hardSnapLimitMeters) ||
    options.hardSnapLimitMeters <= 0
  ) {
    throw new Error(
      "building route audit: hardSnapLimitMeters must be positive",
    );
  }

  const components = graphComponents(graph);
  const provisional = buildings.map((building) => {
    if (!isFiniteCoordinate(building.lat, building.lon)) {
      return {
        building,
        nodeIndex: null,
        snapMeters: null,
        componentId: null,
        componentSize: null,
      };
    }
    const lat = building.lat as number;
    const lon = building.lon as number;
    const nearest = nearestGraphNodeUnchecked(graph, { lat, lon });
    const componentId = components.componentByNode[nearest.nodeIndex];
    if (componentId === undefined) {
      throw new Error(
        `building route audit: component missing for node ${nearest.nodeIndex}`,
      );
    }
    return {
      building,
      nodeIndex: nearest.nodeIndex,
      snapMeters: nearest.snapMeters,
      componentId,
      componentSize: components.sizeByComponent.get(componentId) ?? 0,
    };
  });

  const validSnapMeters = provisional.flatMap((row) =>
    row.snapMeters === null ? [] : [row.snapMeters],
  );
  const eligibleSnapMeters = provisional.flatMap((row) =>
    row.snapMeters !== null &&
    row.snapMeters <= options.hardSnapLimitMeters &&
    row.componentId === components.mainComponentId
      ? [row.snapMeters]
      : [],
  );
  const review = deriveReviewThreshold(
    eligibleSnapMeters,
    options.hardSnapLimitMeters,
  );

  const rows: BuildingEndpointAuditRow[] = provisional.map((row) => {
    const { building, nodeIndex, snapMeters, componentId, componentSize } = row;
    if (nodeIndex === null || snapMeters === null || componentId === null) {
      return {
        buildingId: building.id,
        buildingName: building.buildingName,
        lat: building.lat,
        lon: building.lon,
        status: "invalid-coordinate",
        reason: "invalid-coordinate",
        nodeIndex: null,
        osmId: null,
        nodeLat: null,
        nodeLon: null,
        snapMeters: null,
        componentId: null,
        componentSize: null,
      };
    }

    const graphNode = graph.nodes[nodeIndex];
    if (!graphNode) {
      throw new Error(
        `building route audit: snapped node ${nodeIndex} is missing`,
      );
    }
    const [osmId, nodeLat, nodeLon] = graphNode;
    let status: BuildingEndpointStatus = "supported";
    let reason: BuildingEndpointAuditRow["reason"] = "within-baseline";
    if (snapMeters > options.hardSnapLimitMeters) {
      status = "unsupported";
      reason = "snap-distance-over-hard-limit";
    } else if (componentId !== components.mainComponentId) {
      status = "unsupported";
      reason = "outside-main-component";
    } else if (snapMeters > review.threshold) {
      status = "review";
      reason = "snap-distance-outlier";
    }

    return {
      buildingId: building.id,
      buildingName: building.buildingName,
      lat: building.lat,
      lon: building.lon,
      status,
      reason,
      nodeIndex,
      osmId,
      nodeLat,
      nodeLon,
      snapMeters: roundMeters(snapMeters),
      componentId,
      componentSize,
    };
  });

  rows.sort((a, b) => {
    if (a.snapMeters === null && b.snapMeters === null)
      return a.buildingName.localeCompare(b.buildingName);
    if (a.snapMeters === null) return -1;
    if (b.snapMeters === null) return 1;
    return (
      b.snapMeters - a.snapMeters ||
      a.buildingName.localeCompare(b.buildingName)
    );
  });

  const count = (status: BuildingEndpointStatus) =>
    rows.filter((row) => row.status === status).length;

  return {
    policy: {
      hardSnapLimitMeters: options.hardSnapLimitMeters,
      reviewSnapThresholdMeters: roundMeters(review.threshold),
      reviewThresholdBasis: review.basis,
      connectivityRule: "nearest-node-must-be-in-largest-component",
    },
    graph: {
      source: graph.meta?.source ?? null,
      generated: graph.meta?.generated ?? null,
      nodeCount: graph.nodes.length,
      edgeCount: graph.edges.length,
      componentCount: components.sizeByComponent.size,
      mainComponentId: components.mainComponentId,
      mainComponentSize: components.mainComponentSize,
    },
    summary: {
      buildingCount: rows.length,
      validCoordinateCount: rows.length - count("invalid-coordinate"),
      invalidCoordinateCount: count("invalid-coordinate"),
      supportedCount: count("supported"),
      reviewCount: count("review"),
      unsupportedCount: count("unsupported"),
    },
    snapDistribution: distributionStats(validSnapMeters),
    eligibleSnapDistribution: distributionStats(eligibleSnapMeters),
    buildings: rows,
  };
}
