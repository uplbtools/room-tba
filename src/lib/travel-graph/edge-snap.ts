import { distanceMeters } from "../campus-route";
import { edgeCoordinates, type TravelGraph } from "./engine";

export type EdgeSnapCoordinate = [lng: number, lat: number];

export type SegmentProjection = {
  coordinate: EdgeSnapCoordinate;
  segmentFraction: number;
  distanceMeters: number;
};

export type GraphEdgeSnap = {
  edgeIndex: number;
  segmentIndex: number;
  segmentFraction: number;
  snappedCoordinate: EdgeSnapCoordinate;
  snapMeters: number;
  uNodeIndex: number;
  vNodeIndex: number;
  oneway: boolean;
  edgeMetersFromU: number;
  edgeMetersToV: number;
  geometryMetersFromU: number;
  geometryMetersToV: number;
  fractionAlongEdge: number;
};

type EdgeGeometryIndexEntry = {
  coordinates: EdgeSnapCoordinate[];
  cumulativeMeters: number[];
  geometryMeters: number;
};

const METERS_PER_DEGREE = 111_320;
const SNAP_EPSILON_METERS = 1e-7;
const edgeGeometryIndexCache = new WeakMap<
  TravelGraph,
  EdgeGeometryIndexEntry[]
>();
const mainComponentEdgeMaskCache = new WeakMap<TravelGraph, Uint8Array>();
const validatedEdgeSnapGraphCache = new WeakSet<TravelGraph>();

function assertEdgeSnapGraph(graph: TravelGraph): void {
  if (validatedEdgeSnapGraphCache.has(graph)) return;

  const nodeCount = graph.lat.length;
  if (graph.lng.length !== nodeCount) {
    throw new Error(
      "building route: graph coordinate arrays have different lengths",
    );
  }
  if (!Number.isFinite(graph.coordScale) || graph.coordScale <= 0) {
    throw new Error(
      "building route: graph coordScale must be a finite positive number",
    );
  }

  for (let nodeIndex = 0; nodeIndex < nodeCount; nodeIndex++) {
    const lat = graph.lat[nodeIndex];
    const lng = graph.lng[nodeIndex];
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
        `building route: graph node ${nodeIndex} has invalid coordinates`,
      );
    }
  }

  for (let edgeIndex = 0; edgeIndex < graph.edges.length; edgeIndex++) {
    const edge = graph.edges[edgeIndex];
    if (!edge) {
      throw new Error(`building route: graph edge ${edgeIndex} is missing`);
    }
    const [u, v, meters, , , deltas] = edge;
    if (
      !Number.isInteger(u) ||
      !Number.isInteger(v) ||
      u < 0 ||
      v < 0 ||
      u >= nodeCount ||
      v >= nodeCount
    ) {
      throw new Error("building route: graph contains an out-of-range edge");
    }
    if (!Number.isFinite(meters) || meters <= 0) {
      throw new Error(
        `building route: graph edge ${edgeIndex} has invalid distance`,
      );
    }
    if (
      !Array.isArray(deltas) ||
      deltas.length % 2 !== 0 ||
      deltas.some((value) => !Number.isFinite(value))
    ) {
      throw new Error(
        `building route: graph edge ${edgeIndex} has invalid geometry deltas`,
      );
    }
  }

  validatedEdgeSnapGraphCache.add(graph);
}

function sameCoordinate(
  a: EdgeSnapCoordinate,
  b: EdgeSnapCoordinate,
): boolean {
  return Math.abs(a[0] - b[0]) <= 1e-12 && Math.abs(a[1] - b[1]) <= 1e-12;
}

function appendCoordinate(
  coordinates: EdgeSnapCoordinate[],
  coordinate: EdgeSnapCoordinate,
): void {
  const previous = coordinates.at(-1);
  if (!previous || !sameCoordinate(previous, coordinate)) {
    coordinates.push(coordinate);
  }
}

/**
 * Project one geographic point onto a short line segment using the same local
 * tangent-plane approximation as the rest of Room TBA's campus distance math.
 */
export function projectPointToSegmentMeters(
  point: { lat: number; lon: number },
  a: EdgeSnapCoordinate,
  b: EdgeSnapCoordinate,
): SegmentProjection {
  const meanLat = ((point.lat + a[1] + b[1]) / 3) * (Math.PI / 180);
  const metersPerDegreeLon = Math.cos(meanLat) * METERS_PER_DEGREE;
  const ax = (a[0] - point.lon) * metersPerDegreeLon;
  const ay = (a[1] - point.lat) * METERS_PER_DEGREE;
  const bx = (b[0] - point.lon) * metersPerDegreeLon;
  const by = (b[1] - point.lat) * METERS_PER_DEGREE;
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;

  let segmentFraction = 0;
  if (lengthSquared > 0) {
    segmentFraction = Math.min(
      1,
      Math.max(0, -(ax * dx + ay * dy) / lengthSquared),
    );
  }

  const coordinate: EdgeSnapCoordinate = [
    a[0] + (b[0] - a[0]) * segmentFraction,
    a[1] + (b[1] - a[1]) * segmentFraction,
  ];

  return {
    coordinate,
    segmentFraction,
    distanceMeters: distanceMeters(point, {
      lon: coordinate[0],
      lat: coordinate[1],
    }),
  };
}

function edgeGeometryIndex(graph: TravelGraph): EdgeGeometryIndexEntry[] {
  const cached = edgeGeometryIndexCache.get(graph);
  if (cached) return cached;

  const entries = graph.edges.map((_, edgeIndex) => {
    const coordinates = edgeCoordinates(graph, edgeIndex);
    const cumulativeMeters = new Array<number>(coordinates.length).fill(0);
    let geometryMeters = 0;
    for (let i = 1; i < coordinates.length; i++) {
      const previous = coordinates[i - 1];
      const current = coordinates[i];
      if (!previous || !current) continue;
      geometryMeters += distanceMeters(
        { lon: previous[0], lat: previous[1] },
        { lon: current[0], lat: current[1] },
      );
      cumulativeMeters[i] = geometryMeters;
    }
    if (!Number.isFinite(geometryMeters) || geometryMeters <= 0) {
      throw new Error(
        `building route: graph edge ${edgeIndex} has degenerate geometry`,
      );
    }
    return { coordinates, cumulativeMeters, geometryMeters };
  });

  edgeGeometryIndexCache.set(graph, entries);
  return entries;
}

/**
 * Canonical endpoint correlation ignores tiny disconnected graph islands. This
 * mask intentionally mirrors the building router's weak-component policy: edge
 * direction is irrelevant for membership, but remains authoritative later when
 * the virtual query is routed.
 */
function mainComponentEdgeMask(graph: TravelGraph): Uint8Array {
  const cached = mainComponentEdgeMaskCache.get(graph);
  if (cached) return cached;

  const nodeCount = graph.lat.length;
  const neighbors: number[][] = Array.from({ length: nodeCount }, () => []);
  for (const edge of graph.edges) {
    const [u, v] = edge;
    if (
      !Number.isInteger(u) ||
      !Number.isInteger(v) ||
      u < 0 ||
      v < 0 ||
      u >= nodeCount ||
      v >= nodeCount
    ) {
      throw new Error("building route: graph contains an out-of-range edge");
    }
    neighbors[u]?.push(v);
    neighbors[v]?.push(u);
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

  const mask = new Uint8Array(graph.edges.length);
  if (mainComponentId >= 0) {
    for (let edgeIndex = 0; edgeIndex < graph.edges.length; edgeIndex++) {
      const edge = graph.edges[edgeIndex];
      if (
        edge &&
        component[edge[0]] === mainComponentId &&
        component[edge[1]] === mainComponentId
      ) {
        mask[edgeIndex] = 1;
      }
    }
  }
  mainComponentEdgeMaskCache.set(graph, mask);
  return mask;
}

/** Find the closest point on the canonical main-component walk-edge geometry. */
export function nearestEdgeSnap(
  graph: TravelGraph,
  point: { lat: number; lon: number },
): GraphEdgeSnap {
  if (graph.edges.length === 0) {
    throw new Error("building route: travel graph has no edges");
  }

  assertEdgeSnapGraph(graph);
  const indexed = edgeGeometryIndex(graph);
  const eligibleEdges = mainComponentEdgeMask(graph);
  let best:
    | {
        edgeIndex: number;
        segmentIndex: number;
        projection: SegmentProjection;
        geometryMetersFromU: number;
      }
    | undefined;

  for (let edgeIndex = 0; edgeIndex < graph.edges.length; edgeIndex++) {
    if (eligibleEdges[edgeIndex] !== 1) continue;
    const entry = indexed[edgeIndex];
    if (!entry || entry.coordinates.length < 2) continue;

    for (
      let segmentIndex = 0;
      segmentIndex < entry.coordinates.length - 1;
      segmentIndex++
    ) {
      const a = entry.coordinates[segmentIndex];
      const b = entry.coordinates[segmentIndex + 1];
      if (!a || !b) continue;
      const projection = projectPointToSegmentMeters(point, a, b);
      if (
        best &&
        projection.distanceMeters >=
          best.projection.distanceMeters - SNAP_EPSILON_METERS
      ) {
        continue;
      }

      const segmentMeters = distanceMeters(
        { lon: a[0], lat: a[1] },
        { lon: b[0], lat: b[1] },
      );
      best = {
        edgeIndex,
        segmentIndex,
        projection,
        geometryMetersFromU:
          (entry.cumulativeMeters[segmentIndex] ?? 0) +
          segmentMeters * projection.segmentFraction,
      };
    }
  }

  if (!best) {
    throw new Error(
      "building route: walk graph has no usable main-component edge geometry",
    );
  }

  const edge = graph.edges[best.edgeIndex];
  const entry = indexed[best.edgeIndex];
  if (!edge || !entry) {
    throw new Error("building route: snapped edge is missing");
  }

  const [uNodeIndex, vNodeIndex, graphMeters] = edge;
  const fractionAlongEdge =
    entry.geometryMeters > 0
      ? Math.min(
          1,
          Math.max(0, best.geometryMetersFromU / entry.geometryMeters),
        )
      : 0;
  const edgeMetersFromU = graphMeters * fractionAlongEdge;
  const edgeMetersToV = Math.max(0, graphMeters - edgeMetersFromU);

  return {
    edgeIndex: best.edgeIndex,
    segmentIndex: best.segmentIndex,
    segmentFraction: best.projection.segmentFraction,
    snappedCoordinate: best.projection.coordinate,
    snapMeters: best.projection.distanceMeters,
    uNodeIndex,
    vNodeIndex,
    oneway: Boolean(edge[6]),
    edgeMetersFromU,
    edgeMetersToV,
    geometryMetersFromU: best.geometryMetersFromU,
    geometryMetersToV: Math.max(
      0,
      entry.geometryMeters - best.geometryMetersFromU,
    ),
    fractionAlongEdge,
  };
}

function coordinatesFromUToSnap(
  graph: TravelGraph,
  snap: GraphEdgeSnap,
): EdgeSnapCoordinate[] {
  const entry = edgeGeometryIndex(graph)[snap.edgeIndex];
  if (!entry) {
    throw new Error("building route: snapped edge geometry is missing");
  }
  const result: EdgeSnapCoordinate[] = [];
  for (let i = 0; i <= snap.segmentIndex; i++) {
    const coordinate = entry.coordinates[i];
    if (coordinate) appendCoordinate(result, coordinate);
  }
  appendCoordinate(result, snap.snappedCoordinate);
  return result;
}

function coordinatesFromSnapToV(
  graph: TravelGraph,
  snap: GraphEdgeSnap,
): EdgeSnapCoordinate[] {
  const entry = edgeGeometryIndex(graph)[snap.edgeIndex];
  if (!entry) {
    throw new Error("building route: snapped edge geometry is missing");
  }
  const result: EdgeSnapCoordinate[] = [snap.snappedCoordinate];
  for (let i = snap.segmentIndex + 1; i < entry.coordinates.length; i++) {
    const coordinate = entry.coordinates[i];
    if (coordinate) appendCoordinate(result, coordinate);
  }
  return result;
}

export function edgeGeometrySnapToNode(
  graph: TravelGraph,
  snap: GraphEdgeSnap,
  nodeIndex: number,
): EdgeSnapCoordinate[] {
  if (nodeIndex === snap.uNodeIndex) {
    return [...coordinatesFromUToSnap(graph, snap)].reverse();
  }
  if (nodeIndex === snap.vNodeIndex) {
    return coordinatesFromSnapToV(graph, snap);
  }
  throw new Error("building route: node is not an endpoint of snapped edge");
}

export function edgeGeometryNodeToSnap(
  graph: TravelGraph,
  snap: GraphEdgeSnap,
  nodeIndex: number,
): EdgeSnapCoordinate[] {
  if (nodeIndex === snap.uNodeIndex) {
    return coordinatesFromUToSnap(graph, snap);
  }
  if (nodeIndex === snap.vNodeIndex) {
    return [...coordinatesFromSnapToV(graph, snap)].reverse();
  }
  throw new Error("building route: node is not an endpoint of snapped edge");
}

/** Geometry between two virtual points on the same stored edge. */
export function edgeGeometryBetweenSnaps(
  graph: TravelGraph,
  from: GraphEdgeSnap,
  to: GraphEdgeSnap,
): EdgeSnapCoordinate[] {
  if (from.edgeIndex !== to.edgeIndex) {
    throw new Error("building route: edge snaps belong to different edges");
  }

  if (
    Math.abs(from.geometryMetersFromU - to.geometryMetersFromU) <=
    SNAP_EPSILON_METERS
  ) {
    return [from.snappedCoordinate];
  }

  if (from.geometryMetersFromU > to.geometryMetersFromU) {
    return [...edgeGeometryBetweenSnaps(graph, to, from)].reverse();
  }

  const entry = edgeGeometryIndex(graph)[from.edgeIndex];
  if (!entry) {
    throw new Error("building route: snapped edge geometry is missing");
  }
  const result: EdgeSnapCoordinate[] = [from.snappedCoordinate];

  for (
    let vertexIndex = from.segmentIndex + 1;
    vertexIndex <= to.segmentIndex;
    vertexIndex++
  ) {
    const vertex = entry.coordinates[vertexIndex];
    if (vertex) appendCoordinate(result, vertex);
  }
  appendCoordinate(result, to.snappedCoordinate);
  return result;
}