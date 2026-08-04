/**
 * Pure client-side routing engine over the vendored campus path network
 * (#847 travel-time isochrone, #848 measure-route). Data ships as
 * src/generated/walk-graph.json (see scripts/build-walk-graph.ts for the
 * format); load it lazily via ./load.ts.
 *
 * At 1k nodes / 1.5k edges a full Dijkstra runs in single-digit
 * milliseconds, so there is no API, no worker, and it works offline.
 */

import type { Feature, FeatureCollection, LineString } from "geojson";
import {
  CYCLE_EXCLUDED_CLASS,
  CYCLE_KPH,
  DRIVE_CAP_KPH,
  DRIVE_HIGHWAY_CLASSES,
  WALK_KPH,
} from "@constants/travel-modes";
import { distanceMeters } from "../campus-route";

export type TravelMode = "walk" | "cycle" | "drive";

/** [u, v, meters, highwayClass, maxspeedKph|null, geomDeltas, oneway?] */
export type WalkGraphEdge = [
  number,
  number,
  number,
  string,
  number | null,
  number[],
  number?,
];

export type WalkGraphData = {
  meta: { coordScale: number; nodeCount: number; edgeCount: number };
  /** [osmId, lat, lng] */
  nodes: [number, number, number][];
  edges: WalkGraphEdge[];
};

export type TravelGraph = {
  coordScale: number;
  lat: Float64Array;
  lng: Float64Array;
  edges: WalkGraphEdge[];
  /** node index -> outgoing half-edges */
  adjacency: { edge: number; to: number }[][];
};

export function buildTravelGraph(data: WalkGraphData): TravelGraph {
  const n = data.nodes.length;
  const lat = new Float64Array(n);
  const lng = new Float64Array(n);
  data.nodes.forEach(([, nodeLat, nodeLng], i) => {
    lat[i] = nodeLat;
    lng[i] = nodeLng;
  });
  const adjacency: TravelGraph["adjacency"] = Array.from(
    { length: n },
    () => [],
  );
  data.edges.forEach((edge, i) => {
    adjacency[edge[0]].push({ edge: i, to: edge[1] });
    // Collapsed records are two-way unless flagged one-way by the converter.
    if (!edge[6]) adjacency[edge[1]].push({ edge: i, to: edge[0] });
  });
  return {
    coordScale: data.meta.coordScale,
    lat,
    lng,
    edges: data.edges,
    adjacency,
  };
}

/**
 * Traversal seconds for an edge in a mode, or null when the mode cannot use
 * it. Merged osmnx segments carry compound classes ("steps;footway"): cycling
 * rejects any steps component, driving requires every component drivable.
 */
export function edgeSeconds(
  edge: WalkGraphEdge,
  mode: TravelMode,
): number | null {
  const meters = edge[2];
  if (mode === "walk") return meters / (WALK_KPH / 3.6);
  const parts = edge[3].split(";");
  if (mode === "cycle") {
    if (parts.includes(CYCLE_EXCLUDED_CLASS)) return null;
    return meters / (CYCLE_KPH / 3.6);
  }
  if (!parts.every((part) => DRIVE_HIGHWAY_CLASSES.has(part))) return null;
  const kph = Math.min(edge[4] ?? DRIVE_CAP_KPH, DRIVE_CAP_KPH);
  return meters / (kph / 3.6);
}

/** Snap a tap to the closest graph node. Linear scan: 1k nodes is nothing. */
export function nearestNodeIndex(
  graph: TravelGraph,
  lat: number,
  lng: number,
): number {
  let best = 0;
  let bestMeters = Number.POSITIVE_INFINITY;
  for (let i = 0; i < graph.lat.length; i++) {
    const meters = distanceMeters(
      { lat, lon: lng },
      { lat: graph.lat[i], lon: graph.lng[i] },
    );
    if (meters < bestMeters) {
      bestMeters = meters;
      best = i;
    }
  }
  return best;
}

export type DijkstraResult = {
  /** seconds[i] = travel time from source to node i (Infinity = unreachable) */
  seconds: Float64Array;
  /** edge index used to reach node i (-1 at source / unreachable) */
  prevEdge: Int32Array;
  /** node we came from (-1 at source / unreachable) */
  prevNode: Int32Array;
};

/**
 * Single-source Dijkstra with a binary heap. Pass `target` to stop as soon
 * as the target settles (route queries); omit it for a full run (isochrone).
 */
export function dijkstra(
  graph: TravelGraph,
  source: number,
  mode: TravelMode,
  target = -1,
): DijkstraResult {
  const n = graph.lat.length;
  const seconds = new Float64Array(n).fill(Number.POSITIVE_INFINITY);
  const prevEdge = new Int32Array(n).fill(-1);
  const prevNode = new Int32Array(n).fill(-1);
  // Parallel-array binary min-heap keyed on time.
  const heapTime: number[] = [];
  const heapNode: number[] = [];
  const push = (time: number, node: number) => {
    let i = heapTime.length;
    heapTime.push(time);
    heapNode.push(node);
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (heapTime[parent] <= heapTime[i]) break;
      [heapTime[parent], heapTime[i]] = [heapTime[i], heapTime[parent]];
      [heapNode[parent], heapNode[i]] = [heapNode[i], heapNode[parent]];
      i = parent;
    }
  };
  const pop = () => {
    const node = heapNode[0];
    const time = heapTime[0];
    const lastTime = heapTime.pop() as number;
    const lastNode = heapNode.pop() as number;
    if (heapTime.length > 0) {
      heapTime[0] = lastTime;
      heapNode[0] = lastNode;
      let i = 0;
      for (;;) {
        const left = 2 * i + 1;
        const right = left + 1;
        let smallest = i;
        if (left < heapTime.length && heapTime[left] < heapTime[smallest])
          smallest = left;
        if (right < heapTime.length && heapTime[right] < heapTime[smallest])
          smallest = right;
        if (smallest === i) break;
        [heapTime[smallest], heapTime[i]] = [heapTime[i], heapTime[smallest]];
        [heapNode[smallest], heapNode[i]] = [heapNode[i], heapNode[smallest]];
        i = smallest;
      }
    }
    return { time, node };
  };

  seconds[source] = 0;
  push(0, source);
  while (heapTime.length > 0) {
    const { time, node } = pop();
    if (time > seconds[node]) continue; // stale heap entry
    if (node === target) break;
    for (const { edge, to } of graph.adjacency[node]) {
      const cost = edgeSeconds(graph.edges[edge], mode);
      if (cost === null) continue;
      const next = time + cost;
      if (next < seconds[to]) {
        seconds[to] = next;
        prevEdge[to] = edge;
        prevNode[to] = node;
        push(next, to);
      }
    }
  }
  return { seconds, prevEdge, prevNode };
}

/** Full edge geometry as [lng, lat] pairs in stored u -> v order. */
export function edgeCoordinates(
  graph: TravelGraph,
  edgeIndex: number,
): [number, number][] {
  const [u, v, , , , deltas] = graph.edges[edgeIndex];
  const scale = graph.coordScale;
  const coords: [number, number][] = [[graph.lng[u], graph.lat[u]]];
  let prevLng = Math.round(graph.lng[u] * scale);
  let prevLat = Math.round(graph.lat[u] * scale);
  for (let i = 0; i < deltas.length; i += 2) {
    prevLng += deltas[i];
    prevLat += deltas[i + 1];
    coords.push([prevLng / scale, prevLat / scale]);
  }
  coords.push([graph.lng[v], graph.lat[v]]);
  return coords;
}

export type TravelRoute = {
  seconds: number;
  meters: number;
  /** [lng, lat] GeoJSON order, from -> to */
  coordinates: [number, number][];
};

/** Shortest path between two node indexes, or null when the mode has no route. */
export function shortestPath(
  graph: TravelGraph,
  from: number,
  to: number,
  mode: TravelMode,
): TravelRoute | null {
  if (from === to) {
    return {
      seconds: 0,
      meters: 0,
      coordinates: [[graph.lng[from], graph.lat[from]]],
    };
  }
  const { seconds, prevEdge, prevNode } = dijkstra(graph, from, mode, to);
  if (!Number.isFinite(seconds[to])) return null;
  let meters = 0;
  const segments: [number, number][][] = [];
  for (let node = to; node !== from; node = prevNode[node]) {
    const edgeIndex = prevEdge[node];
    const edge = graph.edges[edgeIndex];
    meters += edge[2];
    const coords = edgeCoordinates(graph, edgeIndex);
    // Stored order is u -> v; flip when we traversed v -> u.
    segments.push(edge[1] === node ? coords : [...coords].reverse());
  }
  segments.reverse();
  const coordinates = segments.flatMap((coords, i) =>
    i === 0 ? coords : coords.slice(1),
  );
  return { seconds: seconds[to], meters, coordinates };
}

/**
 * Isochrone rendering data: every reachable edge as a LineString carrying
 * `minutes` (mean of its endpoint times) for a data-driven color ramp.
 */
export function isochroneFeatures(
  graph: TravelGraph,
  seconds: Float64Array,
): FeatureCollection<LineString, { minutes: number }> {
  const features: Feature<LineString, { minutes: number }>[] = [];
  for (let i = 0; i < graph.edges.length; i++) {
    const [u, v] = graph.edges[i];
    const mean = (seconds[u] + seconds[v]) / 2;
    if (!Number.isFinite(mean)) continue;
    features.push({
      type: "Feature",
      geometry: { type: "LineString", coordinates: edgeCoordinates(graph, i) },
      properties: { minutes: Math.round((mean / 60) * 10) / 10 },
    });
  }
  return { type: "FeatureCollection", features };
}
