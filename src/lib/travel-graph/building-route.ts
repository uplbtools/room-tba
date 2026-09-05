/**
 * Pure building-to-building walking routes over Room TBA's vendored campus
 * path graph.
 *
 * Building pins correlate to the closest point on a mapped graph edge, not
 * merely to the closest junction node. The query remains entirely local: each
 * snapped endpoint is treated as a lightweight virtual position on its edge,
 * with partial-edge legs feeding the existing target-bounded Dijkstra engine.
 */

import { WALK_KPH } from "@constants/travel-modes";
import {
  edgeGeometryBetweenSnaps,
  edgeGeometryNodeToSnap,
  edgeGeometrySnapToNode,
  nearestEdgeSnap,
  type GraphEdgeSnap,
} from "./edge-snap";
import { shortestPath, type TravelGraph } from "./engine";

export type BuildingRouteEndpoint = {
  id: number;
  buildingName: string;
  lat: number | null;
  lon: number | null;
};

export type BuildingRouteCoordinate = [lng: number, lat: number];

export type BuildingEndpointSnap = GraphEdgeSnap & {
  /** Always endpoint pin -> snapped point on the mapped edge. */
  endpointToEdgeCoordinates: [
    BuildingRouteCoordinate,
    BuildingRouteCoordinate,
  ];
};

export type BuildingWalkRoute = {
  /** Mapped walk-graph geometry, including partial endpoint edges. */
  graphMeters: number;
  /** Mapped walk-graph time only. */
  graphSeconds: number;
  /** Approximate origin pin -> mapped edge distance. */
  originConnectorMeters: number;
  /** Approximate mapped edge -> destination pin distance. */
  destinationConnectorMeters: number;
  /** Pin connector + mapped graph + pin connector. */
  totalMeters: number;
  /** Pin connector + mapped graph + pin connector, all at WALK_KPH. */
  totalSeconds: number;
  /** Authoritative mapped walking geometry, virtual edge snap -> edge snap. */
  graphCoordinates: BuildingRouteCoordinate[];
  /** Approximate origin pin -> mapped edge connector. */
  originConnectorCoordinates: [
    BuildingRouteCoordinate,
    BuildingRouteCoordinate,
  ];
  /** Approximate mapped edge -> destination pin connector. */
  destinationConnectorCoordinates: [
    BuildingRouteCoordinate,
    BuildingRouteCoordinate,
  ];
};

export type BuildingRouteStatus =
  | "ok"
  | "same-building"
  | "origin-invalid"
  | "destination-invalid"
  | "origin-off-network"
  | "destination-off-network"
  | "no-route";

type BuildingRouteBase = {
  originBuildingId: number;
  destinationBuildingId: number;
  /** The evidence-backed hard ceiling supplied by the endpoint-audit policy. */
  maxSnapMeters: number;
  /** Captured for debugging/provenance; display copy stays approximate. */
  walkingSpeedKph: number;
};

export type BuildingWalkRouteResult =
  | (BuildingRouteBase & {
      status: "same-building" | "origin-invalid" | "destination-invalid";
      originSnap: null;
      destinationSnap: null;
      route: null;
    })
  | (BuildingRouteBase & {
      status: "origin-off-network";
      originSnap: BuildingEndpointSnap;
      destinationSnap: null;
      route: null;
    })
  | (BuildingRouteBase & {
      status: "destination-off-network";
      originSnap: BuildingEndpointSnap;
      destinationSnap: BuildingEndpointSnap;
      route: null;
    })
  | (BuildingRouteBase & {
      status: "no-route";
      originSnap: BuildingEndpointSnap;
      destinationSnap: BuildingEndpointSnap;
      route: null;
    })
  | (BuildingRouteBase & {
      status: "ok";
      originSnap: BuildingEndpointSnap;
      destinationSnap: BuildingEndpointSnap;
      route: BuildingWalkRoute;
    });

export type RouteBuildingToBuildingInput = {
  graph: TravelGraph;
  origin: BuildingRouteEndpoint;
  destination: BuildingRouteEndpoint;
  /** Hard route-eligibility ceiling established by the endpoint audit. */
  maxSnapMeters: number;
};

const WALK_MPS = WALK_KPH / 3.6;
const EDGE_POSITION_EPSILON_METERS = 1e-7;
const mainComponentCache = new WeakMap<TravelGraph, Uint8Array>();
const validatedAdjacencyCache = new WeakSet<TravelGraph>();

/**
 * Weak-component eligibility shared with the endpoint-audit semantics.
 * Directionality is ignored only for component membership; shortestPath still
 * enforces one-way traversal later.
 */
export function mainWalkComponentMask(graph: TravelGraph): Uint8Array {
  const cached = mainComponentCache.get(graph);
  if (cached) return cached;

  const nodeCount = graph.lat.length;
  if (graph.lng.length !== nodeCount) {
    throw new Error(
      "building route: graph coordinate arrays have different lengths",
    );
  }

  const neighbors: number[][] = Array.from({ length: nodeCount }, () => []);
  for (const edge of graph.edges) {
    const from = edge[0];
    const to = edge[1];
    if (
      !Number.isInteger(from) ||
      !Number.isInteger(to) ||
      from < 0 ||
      to < 0 ||
      from >= nodeCount ||
      to >= nodeCount
    ) {
      throw new Error("building route: graph contains an out-of-range edge");
    }
    neighbors[from]?.push(to);
    neighbors[to]?.push(from);
  }

  const component = new Int32Array(nodeCount).fill(-1);
  const sizes: number[] = [];
  let componentId = 0;
  for (let start = 0; start < nodeCount; start++) {
    if (component[start] !== -1) continue;
    const stack = [start];
    component[start] = componentId;
    let size = 0;
    while (stack.length > 0) {
      const node = stack.pop();
      if (node === undefined) break;
      size += 1;
      for (const next of neighbors[node] ?? []) {
        if (component[next] !== -1) continue;
        component[next] = componentId;
        stack.push(next);
      }
    }
    sizes.push(size);
    componentId += 1;
  }

  let mainComponentId = -1;
  let mainSize = -1;
  for (let id = 0; id < sizes.length; id++) {
    const size = sizes[id] ?? 0;
    if (size > mainSize) {
      mainSize = size;
      mainComponentId = id;
    }
  }

  const mask = new Uint8Array(nodeCount);
  if (mainComponentId >= 0) {
    for (let i = 0; i < nodeCount; i++) {
      if (component[i] === mainComponentId) mask[i] = 1;
    }
  }
  mainComponentCache.set(graph, mask);
  return mask;
}

export function isMainWalkComponentNode(
  graph: TravelGraph,
  nodeIndex: number,
): boolean {
  return mainWalkComponentMask(graph)[nodeIndex] === 1;
}

export function isMainWalkComponentEdge(
  graph: TravelGraph,
  edgeIndex: number,
): boolean {
  const edge = graph.edges[edgeIndex];
  if (!edge) return false;
  const mask = mainWalkComponentMask(graph);
  return mask[edge[0]] === 1 && mask[edge[1]] === 1;
}

export function isValidBuildingRouteCoordinate(
  endpoint: Pick<BuildingRouteEndpoint, "lat" | "lon">,
): endpoint is { lat: number; lon: number } {
  const { lat, lon } = endpoint;
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

function assertMaxSnapMeters(maxSnapMeters: number): void {
  if (!Number.isFinite(maxSnapMeters) || maxSnapMeters < 0) {
    throw new RangeError(
      "building route maxSnapMeters must be a finite, non-negative number",
    );
  }
}

function assertGraphHasNodes(graph: TravelGraph): void {
  if (graph.lat.length === 0 || graph.lng.length === 0) {
    throw new Error("building route: travel graph has no nodes");
  }
  if (graph.lat.length !== graph.lng.length) {
    throw new Error(
      "building route: graph coordinate arrays have different lengths",
    );
  }
  for (let i = 0; i < graph.lat.length; i++) {
    const lat = graph.lat[i];
    const lng = graph.lng[i];
    if (
      lat === undefined ||
      lng === undefined ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      throw new Error(
        `building route: graph node ${i} has invalid coordinates`,
      );
    }
  }
}

function assertGraphAdjacency(graph: TravelGraph): void {
  if (validatedAdjacencyCache.has(graph)) return;
  const nodeCount = graph.lat.length;
  if (graph.adjacency.length !== nodeCount) {
    throw new Error(
      "building route: graph adjacency length does not match node count",
    );
  }

  // Dijkstra treats edge distance as traversal cost. Zero-length or negative
  // records would create a free graph transition, so reject them before route
  // planning even if the shared graph engine was handed malformed input.
  for (let edgeIndex = 0; edgeIndex < graph.edges.length; edgeIndex++) {
    const edge = graph.edges[edgeIndex];
    if (!edge || !Number.isFinite(edge[2]) || edge[2] <= 0) {
      throw new Error(
        `building route: graph edge ${edgeIndex} has invalid distance`,
      );
    }
  }

  const forwardSeen = new Uint8Array(graph.edges.length);
  const reverseSeen = new Uint8Array(graph.edges.length);
  for (let nodeIndex = 0; nodeIndex < graph.adjacency.length; nodeIndex++) {
    for (const halfEdge of graph.adjacency[nodeIndex] ?? []) {
      const { edge: edgeIndex, to } = halfEdge;
      const edge = graph.edges[edgeIndex];
      if (
        !Number.isInteger(edgeIndex) ||
        !Number.isInteger(to) ||
        !edge ||
        to < 0 ||
        to >= nodeCount
      ) {
        throw new Error(
          "building route: graph adjacency contains an invalid half-edge",
        );
      }
      const [u, v, , , , , oneway] = edge;

      // An undirected self-loop is represented by two identical adjacency
      // halves because u === v. Count the first as the stored direction and
      // the second as the reverse direction instead of classifying both as
      // forward. One-way self-loops legitimately have only the first half.
      if (u === v && nodeIndex === u && to === u) {
        if (forwardSeen[edgeIndex] !== 1) {
          forwardSeen[edgeIndex] = 1;
          continue;
        }
        if (!oneway && reverseSeen[edgeIndex] !== 1) {
          reverseSeen[edgeIndex] = 1;
          continue;
        }
        throw new Error(
          `building route: graph adjacency is inconsistent for edge ${edgeIndex}`,
        );
      }

      if (nodeIndex === u && to === v) {
        forwardSeen[edgeIndex] = 1;
        continue;
      }
      if (!oneway && nodeIndex === v && to === u) {
        reverseSeen[edgeIndex] = 1;
        continue;
      }
      throw new Error(
        `building route: graph adjacency is inconsistent for edge ${edgeIndex}`,
      );
    }
  }

  for (let edgeIndex = 0; edgeIndex < graph.edges.length; edgeIndex++) {
    const edge = graph.edges[edgeIndex];
    if (!edge) continue;
    if (
      forwardSeen[edgeIndex] !== 1 ||
      (!edge[6] && reverseSeen[edgeIndex] !== 1)
    ) {
      throw new Error(
        `building route: graph adjacency is incomplete for edge ${edgeIndex}`,
      );
    }
  }
  validatedAdjacencyCache.add(graph);
}

/** Snap a valid building pin to the closest point on the walking graph. */
export function snapBuildingEndpoint(
  graph: TravelGraph,
  endpoint: BuildingRouteEndpoint & { lat: number; lon: number },
): BuildingEndpointSnap {
  assertGraphHasNodes(graph);
  // Validate topology before edge decoding so malformed node references fail
  // with the same explicit structural error as component membership checks.
  mainWalkComponentMask(graph);
  const snap = nearestEdgeSnap(graph, endpoint);
  const endpointCoordinate: BuildingRouteCoordinate = [
    endpoint.lon,
    endpoint.lat,
  ];
  return {
    ...snap,
    endpointToEdgeCoordinates: [endpointCoordinate, snap.snappedCoordinate],
  };
}

type VirtualNodeLeg = {
  nodeIndex: number;
  meters: number;
  coordinates: BuildingRouteCoordinate[];
};

type GraphRouteCandidate = {
  meters: number;
  coordinates: BuildingRouteCoordinate[];
};

function sameCoordinate(
  a: BuildingRouteCoordinate,
  b: BuildingRouteCoordinate,
): boolean {
  return Math.abs(a[0] - b[0]) <= 1e-12 && Math.abs(a[1] - b[1]) <= 1e-12;
}

function concatCoordinatePaths(
  ...paths: BuildingRouteCoordinate[][]
): BuildingRouteCoordinate[] {
  const result: BuildingRouteCoordinate[] = [];
  for (const path of paths) {
    for (const coordinate of path) {
      const previous = result.at(-1);
      if (!previous || !sameCoordinate(previous, coordinate)) {
        result.push(coordinate);
      }
    }
  }
  return result;
}

function dedupeLegs(legs: VirtualNodeLeg[]): VirtualNodeLeg[] {
  const bestByNode = new Map<number, VirtualNodeLeg>();
  for (const leg of legs) {
    const previous = bestByNode.get(leg.nodeIndex);
    if (!previous || leg.meters < previous.meters) {
      bestByNode.set(leg.nodeIndex, leg);
    }
  }
  return [...bestByNode.values()];
}

function originExitLegs(
  graph: TravelGraph,
  snap: BuildingEndpointSnap,
): VirtualNodeLeg[] {
  const legs: VirtualNodeLeg[] = [];
  if (!snap.oneway || snap.edgeMetersFromU <= EDGE_POSITION_EPSILON_METERS) {
    legs.push({
      nodeIndex: snap.uNodeIndex,
      meters: snap.edgeMetersFromU,
      coordinates: edgeGeometrySnapToNode(graph, snap, snap.uNodeIndex),
    });
  }
  // On a stored u -> v one-way edge, a virtual origin may always continue to v.
  legs.push({
    nodeIndex: snap.vNodeIndex,
    meters: snap.edgeMetersToV,
    coordinates: edgeGeometrySnapToNode(graph, snap, snap.vNodeIndex),
  });
  return dedupeLegs(legs);
}

function destinationEntryLegs(
  graph: TravelGraph,
  snap: BuildingEndpointSnap,
): VirtualNodeLeg[] {
  const legs: VirtualNodeLeg[] = [
    {
      nodeIndex: snap.uNodeIndex,
      meters: snap.edgeMetersFromU,
      coordinates: edgeGeometryNodeToSnap(graph, snap, snap.uNodeIndex),
    },
  ];
  if (!snap.oneway || snap.edgeMetersToV <= EDGE_POSITION_EPSILON_METERS) {
    legs.push({
      nodeIndex: snap.vNodeIndex,
      meters: snap.edgeMetersToV,
      coordinates: edgeGeometryNodeToSnap(graph, snap, snap.vNodeIndex),
    });
  }
  return dedupeLegs(legs);
}

function sameEdgeDirectCandidate(
  graph: TravelGraph,
  origin: BuildingEndpointSnap,
  destination: BuildingEndpointSnap,
): GraphRouteCandidate | null {
  if (origin.edgeIndex !== destination.edgeIndex) return null;
  const delta = destination.edgeMetersFromU - origin.edgeMetersFromU;
  if (origin.oneway && delta < -EDGE_POSITION_EPSILON_METERS) return null;
  return {
    meters: Math.abs(delta),
    coordinates: edgeGeometryBetweenSnaps(graph, origin, destination),
  };
}

function routeBetweenEdgeSnaps(
  graph: TravelGraph,
  origin: BuildingEndpointSnap,
  destination: BuildingEndpointSnap,
): GraphRouteCandidate | null {
  let best = sameEdgeDirectCandidate(graph, origin, destination);

  for (const originLeg of originExitLegs(graph, origin)) {
    for (const destinationLeg of destinationEntryLegs(graph, destination)) {
      const middle = shortestPath(
        graph,
        originLeg.nodeIndex,
        destinationLeg.nodeIndex,
        "walk",
      );
      if (!middle) continue;
      const candidate: GraphRouteCandidate = {
        meters: originLeg.meters + middle.meters + destinationLeg.meters,
        coordinates: concatCoordinatePaths(
          originLeg.coordinates,
          middle.coordinates,
          destinationLeg.coordinates,
        ),
      };
      if (
        !best ||
        candidate.meters < best.meters - EDGE_POSITION_EPSILON_METERS
      ) {
        best = candidate;
      }
    }
  }

  return best;
}

/**
 * Calculate one walking route between two building pins.
 *
 * No network request, no multi-modal alternatives, and no straight-line route
 * fallback. The only straight segments are the explicitly exposed endpoint
 * connectors; the authoritative route starts/ends at virtual positions on
 * mapped graph edges.
 */
export function routeBuildingToBuilding({
  graph,
  origin,
  destination,
  maxSnapMeters,
}: RouteBuildingToBuildingInput): BuildingWalkRouteResult {
  assertMaxSnapMeters(maxSnapMeters);

  const base: BuildingRouteBase = {
    originBuildingId: origin.id,
    destinationBuildingId: destination.id,
    maxSnapMeters,
    walkingSpeedKph: WALK_KPH,
  };

  if (origin.id === destination.id) {
    return {
      ...base,
      status: "same-building",
      originSnap: null,
      destinationSnap: null,
      route: null,
    };
  }

  if (!isValidBuildingRouteCoordinate(origin)) {
    return {
      ...base,
      status: "origin-invalid",
      originSnap: null,
      destinationSnap: null,
      route: null,
    };
  }
  if (!isValidBuildingRouteCoordinate(destination)) {
    return {
      ...base,
      status: "destination-invalid",
      originSnap: null,
      destinationSnap: null,
      route: null,
    };
  }

  // The shared travel engine trusts generated input. This feature's contract is
  // stricter: malformed topology must fail closed before Dijkstra can consume it.
  assertGraphAdjacency(graph);

  const originSnap = snapBuildingEndpoint(graph, origin);
  if (
    originSnap.snapMeters > maxSnapMeters ||
    !isMainWalkComponentEdge(graph, originSnap.edgeIndex)
  ) {
    return {
      ...base,
      status: "origin-off-network",
      originSnap,
      destinationSnap: null,
      route: null,
    };
  }

  const destinationSnap = snapBuildingEndpoint(graph, destination);
  if (
    destinationSnap.snapMeters > maxSnapMeters ||
    !isMainWalkComponentEdge(graph, destinationSnap.edgeIndex)
  ) {
    return {
      ...base,
      status: "destination-off-network",
      originSnap,
      destinationSnap,
      route: null,
    };
  }

  const graphRoute = routeBetweenEdgeSnaps(graph, originSnap, destinationSnap);
  if (!graphRoute) {
    return {
      ...base,
      status: "no-route",
      originSnap,
      destinationSnap,
      route: null,
    };
  }

  const connectorMeters = originSnap.snapMeters + destinationSnap.snapMeters;
  const graphSeconds = graphRoute.meters / WALK_MPS;
  const connectorSeconds = connectorMeters / WALK_MPS;

  return {
    ...base,
    status: "ok",
    originSnap,
    destinationSnap,
    route: {
      graphMeters: graphRoute.meters,
      graphSeconds,
      originConnectorMeters: originSnap.snapMeters,
      destinationConnectorMeters: destinationSnap.snapMeters,
      totalMeters: graphRoute.meters + connectorMeters,
      totalSeconds: graphSeconds + connectorSeconds,
      graphCoordinates: graphRoute.coordinates,
      originConnectorCoordinates: originSnap.endpointToEdgeCoordinates,
      destinationConnectorCoordinates: [
        destinationSnap.snappedCoordinate,
        destinationSnap.endpointToEdgeCoordinates[0],
      ],
    },
  };
}
