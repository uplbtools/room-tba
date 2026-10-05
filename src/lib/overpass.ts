/**
 * Minimal Overpass API helpers for fetching a building footprint near a coord.
 * We only need the closest building polygon and a couple of OSM tags.
 */

export type LngLat = [number, number];

export type OsmBuildingFootprint = {
  /** Outer ring as [lng, lat][], closed (first === last). */
  outline: LngLat[];
  /** Estimated number of floors above ground from OSM tags, or null if unknown. */
  levels: number | null;
  /** OSM-tag-derived height in meters, or null if unknown. */
  heightMeters: number | null;
  /** Building name from OSM (`name` tag), if present. */
  osmName: string | null;
  /**
   * True when our stored lat/lon actually falls inside this polygon. False
   * means we fell back to the nearest building within the search radius, so the
   * outline may well belong to a neighbour — say so in the UI, don't pretend.
   */
  containsPoint: boolean;
};

// Measured 2026-10-06: overpass-api.de answers form-encoded queries in ~5s
// (raw text/plain bodies get 406/504) and the mail.ru mirror in ~15s.
// overpass.kumi.systems hung with no response, so it is gone.
export const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];
/** Per endpoint, so one hung mirror cannot stall the viewer indefinitely. */
export const OVERPASS_TIMEOUT_MS = 8000;

const FOOTPRINT_CACHE_PREFIX = "room-tba:osm-building-footprint:";
const FOOTPRINT_CACHE_VERSION = 2;
const FOOTPRINT_CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 30;

const cache = new Map<string, Promise<OsmBuildingFootprint | null>>();

type CachedFootprint = {
  version: number;
  cachedAt: number;
  footprint: OsmBuildingFootprint;
};

function cacheKey(lat: number, lon: number, radius: number): string {
  return `${lat.toFixed(5)},${lon.toFixed(5)},${Math.round(radius)}`;
}

function storageKey(key: string): string {
  return `${FOOTPRINT_CACHE_PREFIX}${key}`;
}

export function isFootprint(value: unknown): value is OsmBuildingFootprint {
  const footprint = value as OsmBuildingFootprint;
  return (
    Array.isArray(footprint?.outline) &&
    footprint.outline.length >= 4 &&
    footprint.outline.every(
      (point) =>
        Array.isArray(point) &&
        point.length === 2 &&
        Number.isFinite(point[0]) &&
        Number.isFinite(point[1]),
    )
  );
}

function readStoredFootprint(key: string): OsmBuildingFootprint | null {
  if (typeof localStorage === "undefined") return null;

  try {
    const raw = localStorage.getItem(storageKey(key));
    if (!raw) return null;

    const cached = JSON.parse(raw) as CachedFootprint;
    const expired = Date.now() - cached.cachedAt > FOOTPRINT_CACHE_TTL_MS;
    if (
      cached.version !== FOOTPRINT_CACHE_VERSION ||
      expired ||
      !isFootprint(cached.footprint)
    ) {
      localStorage.removeItem(storageKey(key));
      return null;
    }

    return cached.footprint;
  } catch {
    localStorage.removeItem(storageKey(key));
    return null;
  }
}

function storeFootprint(key: string, footprint: OsmBuildingFootprint): void {
  if (typeof localStorage === "undefined") return;

  try {
    const cached: CachedFootprint = {
      version: FOOTPRINT_CACHE_VERSION,
      cachedAt: Date.now(),
      footprint,
    };
    localStorage.setItem(storageKey(key), JSON.stringify(cached));
  } catch {
    // Storage can be unavailable or full; the in-memory cache still helps.
  }
}

type OverpassNode = { type: "node"; id: number; lat: number; lon: number };
type OverpassWay = {
  type: "way";
  id: number;
  nodes: number[];
  tags?: Record<string, string>;
};
export type OverpassElement = OverpassNode | OverpassWay;

function pointInRing(point: LngLat, ring: LngLat[]): boolean {
  let inside = false;
  const [x, y] = point;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i];
    const b = ring[j];
    if (!a || !b) continue;
    const [xi, yi] = a;
    const [xj, yj] = b;
    const intersects =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-12) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function ringCentroid(ring: LngLat[]): LngLat {
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (const [x, y] of ring) {
    sx += x;
    sy += y;
    n++;
  }
  return [sx / n, sy / n];
}

function distanceSquared(a: LngLat, b: LngLat): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return dx * dx + dy * dy;
}

function parseLevels(tags: Record<string, string> | undefined): number | null {
  if (!tags) return null;
  const raw =
    tags["building:levels"] ??
    tags.levels ??
    tags["building:levels:aboveground"];
  if (!raw) return null;
  const n = parseInt(raw, 10);
  if (Number.isFinite(n) && n > 0 && n < 100) return n;
  return null;
}

function parseHeight(tags: Record<string, string> | undefined): number | null {
  if (!tags) return null;
  const raw = tags.height ?? tags["building:height"];
  if (!raw) return null;
  const n = parseFloat(raw);
  if (Number.isFinite(n) && n > 0 && n < 500) return n;
  return null;
}

/**
 * POSTs `query` as form data (`data=<urlencoded query>`), the form Overpass
 * serves reliably, trying each endpoint under its own timeout.
 */
export async function fetchOverpass(
  query: string,
  options: { headers?: Record<string, string>; timeoutMs?: number } = {},
): Promise<unknown | null> {
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: options.headers,
        body: new URLSearchParams({ data: query }),
        signal: AbortSignal.timeout(options.timeoutMs ?? OVERPASS_TIMEOUT_MS),
      });
      if (!res.ok) continue;
      const json = (await res.json()) as { remark?: string } | null;
      // A 200 with a `remark` is an Overpass runtime error (timeout, load)
      // and comes with empty `elements`; it does not mean "no building".
      if (json?.remark) continue;
      return json;
    } catch {
      // timeout, network error, or bad JSON: try the next endpoint
    }
  }
  return null;
}

export function footprintQuery(lat: number, lon: number, radius = 35): string {
  return `
      [out:json][timeout:25];
      (
        way["building"](around:${radius},${lat},${lon});
      );
      out;
      >;
      out skel qt;
    `;
}

/**
 * From a `footprintQuery` response, picks the building way containing
 * (lat, lon), else the one whose centroid is nearest.
 */
export function selectFootprint(
  data: { elements?: OverpassElement[] } | null,
  lat: number,
  lon: number,
): OsmBuildingFootprint | null {
  if (!data?.elements?.length) return null;

  const nodes = new Map<number, OverpassNode>();
  const ways: OverpassWay[] = [];
  for (const el of data.elements) {
    if (el.type === "node") nodes.set(el.id, el);
    else if (el.type === "way") ways.push(el);
  }

  if (ways.length === 0) return null;

  const candidates = ways
    .map<{ way: OverpassWay; ring: LngLat[] } | null>((way) => {
      const ring: LngLat[] = [];
      for (const id of way.nodes) {
        const node = nodes.get(id);
        if (!node) return null;
        ring.push([node.lon, node.lat]);
      }
      if (ring.length < 4) return null;
      return { way, ring };
    })
    .filter((c): c is { way: OverpassWay; ring: LngLat[] } => c !== null);

  if (candidates.length === 0) return null;

  const target: LngLat = [lon, lat];

  const containing = candidates.find((c) => pointInRing(target, c.ring));
  const chosen =
    containing ??
    candidates.reduce((best, current) => {
      const bestD = distanceSquared(ringCentroid(best.ring), target);
      const curD = distanceSquared(ringCentroid(current.ring), target);
      return curD < bestD ? current : best;
    });

  return {
    outline: chosen.ring,
    levels: parseLevels(chosen.way.tags),
    heightMeters: parseHeight(chosen.way.tags),
    osmName: chosen.way.tags?.name ?? null,
    containsPoint: containing !== undefined,
  };
}

/**
 * Returns the closest building polygon to (lat, lon) within `radius` meters,
 * along with level/height metadata if OSM provides it.
 */
export async function fetchBuildingFootprint(
  lat: number,
  lon: number,
  radius = 35,
): Promise<OsmBuildingFootprint | null> {
  const key = cacheKey(lat, lon, radius);
  const existing = cache.get(key);
  if (existing) return existing;

  const stored = readStoredFootprint(key);
  if (stored) {
    const promise = Promise.resolve(stored);
    cache.set(key, promise);
    return promise;
  }

  const promise = (async () => {
    const data = (await fetchOverpass(footprintQuery(lat, lon, radius))) as {
      elements?: OverpassElement[];
    } | null;
    const footprint = selectFootprint(data, lat, lon);
    if (footprint) storeFootprint(key, footprint);
    return footprint;
  })();

  cache.set(key, promise);
  return promise;
}
