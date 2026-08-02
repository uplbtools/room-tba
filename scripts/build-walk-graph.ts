/**
 * Build src/generated/walk-graph.json from an osmnx GraphML export.
 *
 * Usage: bun scripts/build-walk-graph.ts <path-to-graphml> [output-json]
 *
 * The GraphML source (campus walking network, ~1MB) stays on the maintainer
 * machine; only the converted JSON is committed. Forks rebuild with their own
 * osmnx export: `ox.save_graphml(ox.graph_from_place("<campus>", network_type="all"))`.
 *
 * Output format (see src/lib/travel-graph/engine.ts for the consumer):
 * - nodes: [osmId, lat, lng][]
 * - edges: [uIdx, vIdx, meters, highwayClass, maxspeedKph|null, geomDeltas, oneway?]
 *   - uIdx/vIdx index into nodes
 *   - highwayClass: OSM highway value; osmnx merged-segment lists become "a;b"
 *   - geomDeltas: interior LINESTRING points (endpoints dropped; they equal the
 *     node coords), delta-encoded ints at 1e-6 deg: [dLng, dLat, ...] relative
 *     to the previous point, starting from round(uNode * 1e6). Empty = straight.
 *   - oneway: 1 only when no reverse twin existed (never for the UPLB export);
 *     reverse-duplicate pairs are collapsed to one undirected record.
 */

import { basename } from "node:path";

type DirectedEdge = {
  source: string;
  target: string;
  meters: number;
  highway: string;
  maxspeed: number | null;
  geometry: [number, number][] | null; // [lng, lat] including endpoints
};

const COORD_SCALE = 1e6;

function parseKeyMap(xml: string): Map<string, string> {
  // key id -> attr.name, e.g. d15 -> length
  const map = new Map<string, string>();
  const re =
    /<key id="([^"]+)" for="(?:node|edge|graph)" attr\.name="([^"]+)"/g;
  for (let m = re.exec(xml); m; m = re.exec(xml)) map.set(m[1], m[2]);
  return map;
}

function parseData(
  body: string,
  keys: Map<string, string>,
): Map<string, string> {
  const map = new Map<string, string>();
  const re = /<data key="([^"]+)">([^<]*)<\/data>/g;
  for (let m = re.exec(body); m; m = re.exec(body)) {
    const name = keys.get(m[1]);
    if (name) map.set(name, m[2]);
  }
  return map;
}

/** osmnx stringifies merged-segment attrs as python lists: "['steps', 'footway']". */
function pythonListParts(value: string): string[] {
  if (!value.startsWith("[")) return [value];
  return value
    .slice(1, -1)
    .split(",")
    .map((s) => s.trim().replace(/^'|'$/g, ""));
}

function parseLinestring(wkt: string): [number, number][] {
  const inner = wkt.slice(wkt.indexOf("(") + 1, wkt.lastIndexOf(")"));
  return inner.split(",").map((pair) => {
    const [lng, lat] = pair.trim().split(/\s+/).map(Number);
    return [lng, lat];
  });
}

export function convertGraphml(xml: string, sourceName: string) {
  const keys = parseKeyMap(xml);

  const nodeIds: string[] = [];
  const nodeIndex = new Map<string, number>();
  const nodeCoords: [number, number][] = []; // [lat, lng]
  const nodeRe = /<node id="([^"]+)">([\s\S]*?)<\/node>/g;
  for (let m = nodeRe.exec(xml); m; m = nodeRe.exec(xml)) {
    const data = parseData(m[2], keys);
    const lat = Number(data.get("y"));
    const lng = Number(data.get("x"));
    if (!Number.isFinite(lat) || !Number.isFinite(lng))
      throw new Error(`node ${m[1]} missing x/y`);
    nodeIndex.set(m[1], nodeIds.length);
    nodeIds.push(m[1]);
    nodeCoords.push([lat, lng]);
  }

  const directed: DirectedEdge[] = [];
  const edgeRe =
    /<edge source="([^"]+)" target="([^"]+)"[^>]*>([\s\S]*?)<\/edge>/g;
  for (let m = edgeRe.exec(xml); m; m = edgeRe.exec(xml)) {
    const data = parseData(m[3], keys);
    const meters = Number(data.get("length"));
    if (!Number.isFinite(meters))
      throw new Error(`edge ${m[1]}->${m[2]} missing length`);
    const maxspeedRaw = data.get("maxspeed");
    const maxspeed = maxspeedRaw
      ? Number.parseInt(pythonListParts(maxspeedRaw)[0], 10)
      : null;
    const geometryRaw = data.get("geometry");
    directed.push({
      source: m[1],
      target: m[2],
      meters,
      highway: pythonListParts(data.get("highway") ?? "unknown").join(";"),
      maxspeed: Number.isFinite(maxspeed as number) ? maxspeed : null,
      geometry: geometryRaw ? parseLinestring(geometryRaw) : null,
    });
  }

  // Collapse reverse duplicates: pair u->v with v->u of identical length+class.
  const pending = new Map<string, DirectedEdge[]>();
  const collapsed: DirectedEdge[] = [];
  const onewayFlags: boolean[] = [];
  const edgeKey = (a: string, b: string, e: DirectedEdge) =>
    `${a}|${b}|${e.meters.toFixed(3)}|${e.highway}`;
  for (const e of directed) {
    const twinKey = edgeKey(e.target, e.source, e);
    const twins = pending.get(twinKey);
    if (twins?.length) {
      const twin = twins.pop() as DirectedEdge;
      // Prefer the direction that carries geometry (should be both or neither).
      collapsed.push(e.geometry ? e : twin);
      onewayFlags.push(false);
    } else {
      const own = edgeKey(e.source, e.target, e);
      const list = pending.get(own) ?? [];
      list.push(e);
      pending.set(own, list);
    }
  }
  for (const list of pending.values()) {
    for (const e of list) {
      collapsed.push(e);
      onewayFlags.push(true);
    }
  }
  const onewayCount = onewayFlags.filter(Boolean).length;

  const edges = collapsed.map((e, i) => {
    const u = nodeIndex.get(e.source);
    const v = nodeIndex.get(e.target);
    if (u === undefined || v === undefined)
      throw new Error(`edge ${e.source}->${e.target} references unknown node`);
    const deltas: number[] = [];
    if (e.geometry && e.geometry.length > 2) {
      const [uLat, uLng] = nodeCoords[u];
      let prevLng = Math.round(uLng * COORD_SCALE);
      let prevLat = Math.round(uLat * COORD_SCALE);
      for (const [lng, lat] of e.geometry.slice(1, -1)) {
        const sLng = Math.round(lng * COORD_SCALE);
        const sLat = Math.round(lat * COORD_SCALE);
        deltas.push(sLng - prevLng, sLat - prevLat);
        prevLng = sLng;
        prevLat = sLat;
      }
    }
    const record: (string | number | number[] | null)[] = [
      u,
      v,
      Math.round(e.meters * 100) / 100,
      e.highway,
      e.maxspeed,
      deltas,
    ];
    if (onewayFlags[i]) record.push(1);
    return record;
  });

  return {
    meta: {
      source: sourceName,
      generated: new Date().toISOString().slice(0, 10),
      license:
        "Path network derived from OpenStreetMap data, © OpenStreetMap contributors, ODbL",
      nodeCount: nodeIds.length,
      edgeCount: edges.length,
      sourceDirectedEdges: directed.length,
      onewayCount,
      coordScale: COORD_SCALE,
    },
    nodes: nodeIds.map((id, i) => [
      Number(id) || id,
      nodeCoords[i][0],
      nodeCoords[i][1],
    ]),
    edges,
  };
}

if (import.meta.main) {
  const [gmlPath, outPath = "src/generated/walk-graph.json"] =
    process.argv.slice(2);
  if (!gmlPath) {
    console.error(
      "Usage: bun scripts/build-walk-graph.ts <path-to-graphml> [output-json]",
    );
    process.exit(1);
  }
  const xml = await Bun.file(gmlPath).text();
  const graph = convertGraphml(xml, basename(gmlPath));
  const json = JSON.stringify(graph);
  await Bun.write(outPath, json);
  console.log(
    `${outPath}: ${graph.meta.nodeCount} nodes, ${graph.meta.edgeCount} undirected edges ` +
      `(${graph.meta.sourceDirectedEdges} directed in source, ${graph.meta.onewayCount} one-way), ` +
      `${(json.length / 1024).toFixed(1)} KB raw`,
  );
}
