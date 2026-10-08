/**
 * Runtime Street View lookup for entities the committed manifest doesn't
 * cover (food spots, stores, dorms and orgs added after the last fetch-script
 * run). One free metadata request per pin when its sheet opens, cached in
 * memory and localStorage, so the image is only ever requested for a pano
 * Google confirmed exists: never the grey "no imagery" tile.
 *
 * Only the pano id, its location and credit are cached, never imagery, and
 * entries expire after 30 days (Google allows pano ids to be kept, other
 * metadata only temporarily).
 */
import { type StreetViewCoords, fetchStreetViewMetadata } from "./street-view";

/** A confirmed pano, aimed from where it was captured toward the place. */
export type StreetViewPano = {
  panoId: string;
  /** Compass heading from the pano to the place; absent when it sits on top. */
  heading?: number;
  /** "© Google" for Google captures; the uploader's credit otherwise. */
  copyright?: string;
  /** Capture month, "2026-02". */
  date?: string;
};

/** Same reach the gallery uses: campus pins sit well back from the road. */
export const LOOKUP_RADIUS_M = 100;
const TTL_MS = 30 * 24 * 60 * 60 * 1000;
const STORAGE_KEY = "room-tba:street-view-lookup:v1";
const MAX_STORED = 300;
/** Closer than this the pano is at the place and any heading is noise. */
const ON_TOP_M = 3;

type Cached = { at: number; pano: StreetViewPano | null };

const memory = new Map<string, Promise<StreetViewPano | null>>();

/** Initial great-circle bearing from `from` to `to`, degrees 0-359. */
export function bearingDegrees(
  from: StreetViewCoords,
  to: StreetViewCoords,
): number {
  const rad = Math.PI / 180;
  const phi1 = from.lat * rad;
  const phi2 = to.lat * rad;
  const dLng = (to.lng - from.lng) * rad;
  const y = Math.sin(dLng) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLng);
  return (Math.round(Math.atan2(y, x) / rad) + 360) % 360;
}

/** Equirectangular distance in metres; plenty at a 100 m radius. */
function metersBetween(a: StreetViewCoords, b: StreetViewCoords): number {
  const rad = Math.PI / 180;
  const x = (b.lng - a.lng) * rad * Math.cos(((a.lat + b.lat) / 2) * rad);
  const y = (b.lat - a.lat) * rad;
  return Math.hypot(x, y) * 6_371_000;
}

/** Heading from the pano toward the place, or undefined when on top of it. */
export function headingToward(
  pano: StreetViewCoords,
  place: StreetViewCoords,
): number | undefined {
  return metersBetween(pano, place) < ON_TOP_M
    ? undefined
    : bearingDegrees(pano, place);
}

function cacheKey(coords: StreetViewCoords): string {
  return `${coords.lat.toFixed(6)},${coords.lng.toFixed(6)}`;
}

function readStore(): Record<string, Cached> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, Cached>) : {};
  } catch {
    return {};
  }
}

function writeStore(key: string, pano: StreetViewPano | null): void {
  try {
    const store = readStore();
    store[key] = { at: Date.now(), pano };
    const keys = Object.keys(store);
    // Oldest first out; insertion order follows write time.
    for (const old of keys.slice(0, Math.max(0, keys.length - MAX_STORED)))
      delete store[old];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Private mode or full storage: the in-memory cache still dedupes.
  }
}

/**
 * The nearest outdoor pano for a place, aimed at it, or null when Google has
 * no coverage. Transport errors resolve null too but are not persisted, so the
 * next session asks again.
 */
export function lookupStreetView(
  place: StreetViewCoords,
  key: string,
  fetchImpl?: typeof fetch,
): Promise<StreetViewPano | null> {
  const id = cacheKey(place);
  const pending = memory.get(id);
  if (pending) return pending;

  const stored = readStore()[id];
  if (stored && Date.now() - stored.at < TTL_MS) {
    const hit = Promise.resolve(stored.pano);
    memory.set(id, hit);
    return hit;
  }

  const request = fetchStreetViewMetadata(place, key, {
    radius: LOOKUP_RADIUS_M,
    source: "outdoor",
    fetchImpl,
  }).then((meta) => {
    if (meta.status === "ERROR") return null;
    const pano: StreetViewPano | null =
      meta.status === "OK"
        ? {
            panoId: meta.panoId,
            heading: headingToward(meta.location, place),
            copyright: meta.copyright,
            date: meta.date,
          }
        : null;
    writeStore(id, pano);
    return pano;
  });
  memory.set(id, request);
  return request;
}

/** Tests only: forget the in-memory cache. */
export function resetStreetViewLookupCache(): void {
  memory.clear();
}
