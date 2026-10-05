/**
 * Fetch the ground context for the printable transit map (streets, water,
 * buildings and named gates around campus) from OpenStreetMap via Overpass,
 * thin it, and bundle it as `src/constants/transit-basemap.json`. The PDF
 * draws it as light vector line work under the routes, so the request path
 * makes no network calls and embeds no raster tiles.
 *
 * Data (c) OpenStreetMap contributors, ODbL. The PDF footer carries the credit.
 *
 * The raw Overpass response is cached under data/transit-basemap-cache/
 * (gitignored); delete it to refetch.
 *
 * Usage: bun run scripts/generate-transit-basemap.ts
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const OUT_FILE = "src/constants/transit-basemap.json";
const CACHE_DIR = "data/transit-basemap-cache";
const OVERPASS =
  process.env.OVERPASS_URL ?? "https://overpass-api.de/api/interpreter";
const USER_AGENT =
  "room-tba-transit-basemap/1.1 (https://github.com/uplbtools/room-tba)";
/** Campus core plus the places the map can be opened from (IRRI, Jubileeville). */
const BBOX = "14.148,121.226,14.184,121.262";
/** 5 dp is about 1 m; building outlines need it, roads get thinned anyway. */
const PRECISION = 5;
/** Drop consecutive road points closer than this; context, not survey data. */
const THIN_METERS = 12;
/** Sheds and kiosks add bytes, not orientation. */
const MIN_BUILDING_M2 = 120;

type Pt = [number, number]; // [lon, lat]

const QUERY = `[out:json][timeout:90];(
  way["highway"~"^(trunk|primary|secondary|tertiary|residential|unclassified|service|living_street)$"](${BBOX});
  way["waterway"~"^(river|stream|canal)$"](${BBOX});
  way["building"](${BBOX});
  node["barrier"~"^(gate|lift_gate)$"]["name"](${BBOX});
  node["entrance"]["name"~"[Gg]ate"](${BBOX});
);out geom;`;

async function fetchOverpass(): Promise<unknown> {
  mkdirSync(CACHE_DIR, { recursive: true });
  const cachePath = `${CACHE_DIR}/basemap.json`;
  if (existsSync(cachePath)) {
    console.log("using cached Overpass response");
    return JSON.parse(readFileSync(cachePath, "utf8"));
  }
  const res = await fetch(OVERPASS, {
    method: "POST",
    headers: { "User-Agent": USER_AGENT },
    body: `data=${encodeURIComponent(QUERY)}`,
  });
  if (!res.ok) throw new Error(`Overpass ${res.status}`);
  const data = await res.json();
  writeFileSync(cachePath, JSON.stringify(data));
  return data;
}

const M_PER_DEG_LAT = 111320;
const M_PER_DEG_LON = 111320 * Math.cos((14.165 * Math.PI) / 180);
const round = (n: number) => Number(n.toFixed(PRECISION));

function thin(points: Pt[], minMeters: number): Pt[] {
  const out: Pt[] = [];
  for (const p of points) {
    const last = out[out.length - 1];
    if (
      last &&
      Math.hypot(
        (p[0] - last[0]) * M_PER_DEG_LON,
        (p[1] - last[1]) * M_PER_DEG_LAT,
      ) < minMeters
    )
      continue;
    out.push([round(p[0]), round(p[1])]);
  }
  const last = points[points.length - 1];
  const kept = out[out.length - 1];
  if (
    last &&
    kept &&
    (kept[0] !== round(last[0]) || kept[1] !== round(last[1]))
  )
    out.push([round(last[0]), round(last[1])]);
  return out;
}

function areaM2(ring: Pt[]): number {
  let a = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % ring.length];
    a +=
      x1 * M_PER_DEG_LON * (y2 * M_PER_DEG_LAT) -
      x2 * M_PER_DEG_LON * (y1 * M_PER_DEG_LAT);
  }
  return Math.abs(a / 2);
}

type Element = {
  type: string;
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
  geometry?: { lat: number; lon: number }[];
};

const data = (await fetchOverpass()) as { elements?: Element[] };
const roadsMajor: Pt[][] = [];
const roadsMinor: Pt[][] = [];
const water: Pt[][] = [];
const buildings: Pt[][] = [];
const gates: { name: string; lat: number; lon: number }[] = [];
for (const el of data.elements ?? []) {
  const tags = el.tags ?? {};
  if (el.type === "node" && tags.name && el.lat != null && el.lon != null) {
    gates.push({ name: tags.name, lat: round(el.lat), lon: round(el.lon) });
    continue;
  }
  if (el.type !== "way" || !el.geometry || el.geometry.length < 2) continue;
  const raw = el.geometry.map((g): Pt => [g.lon, g.lat]);
  if (tags.building) {
    if (raw.length < 4 || areaM2(raw) < MIN_BUILDING_M2) continue;
    // Outline: drop the closing duplicate; the PDF path closes it.
    const ring = thin(raw.slice(0, -1), 2);
    if (ring.length >= 3) buildings.push(ring);
    continue;
  }
  const pts = thin(raw, THIN_METERS);
  if (pts.length < 2) continue;
  if (tags.waterway) water.push(pts);
  else if (/^(trunk|primary|secondary|tertiary)$/.test(tags.highway ?? ""))
    roadsMajor.push(pts);
  else roadsMinor.push(pts);
}

const body = JSON.stringify({
  roadsMajor,
  roadsMinor,
  water,
  buildings,
  gates,
});
writeFileSync(OUT_FILE, body);
console.log(
  `wrote ${OUT_FILE}: ${roadsMajor.length} major, ${roadsMinor.length} minor, ${water.length} water, ${buildings.length} buildings, ${gates.length} gates (${Math.round(body.length / 1024)} KB)`,
);
