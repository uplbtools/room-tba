// Helpers for downloading the campus map tiles for offline use and for
// reporting how much data is involved. Tiles are fetched from the page so the
// service worker's `map-tiles` runtime cache stores them (see astro.config.mjs).

import { CAMPUS_BOUNDS } from "@constants/map-terrain";
import { CAMPUS_MAP_STYLE_URL, injectMaptilerKey } from "@lib/maptiler-key";

// Campus bounds — mirrors `CAMPUS_MAX_BOUNDS` in src/constants/map-terrain.ts.
const CAMPUS_BOUNDS_LON_LAT = {
  minLon: CAMPUS_BOUNDS.minLng,
  minLat: CAMPUS_BOUNDS.minLat,
  maxLon: CAMPUS_BOUNDS.maxLng,
  maxLat: CAMPUS_BOUNDS.maxLat,
};

export const MIN_ZOOM = 13;
// Hard ceiling; the real cap comes from the tile source's maxzoom (MapTiler
// openmaptiles is 14 — higher zooms are overzoomed client-side, so requesting
// them just 4xx's). Resolved dynamically in getTileTemplate().
export const MAX_ZOOM = 14;
// Rough per-tile size, only used for the pre-download size estimate. Tuned to
// observed campus z13-14 vector tiles (a mix of small and ~150KB tiles).
export const AVG_TILE_BYTES = 40 * 1024;

export const OFFLINE_TILE_CACHE = "map-tiles";
export const OFFLINE_ASSET_CACHE = "map-assets";

export type TileCoord = { z: number; x: number; y: number };

function lonToTileX(lon: number, z: number): number {
  return Math.floor(((lon + 180) / 360) * 2 ** z);
}

function latToTileY(lat: number, z: number): number {
  const rad = (lat * Math.PI) / 180;
  return Math.floor(
    ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * 2 ** z,
  );
}

/** All XYZ tiles covering the campus bounds across the configured zoom range. */
export function getCampusTileCoords(
  minZoom = MIN_ZOOM,
  maxZoom = MAX_ZOOM,
): TileCoord[] {
  const coords: TileCoord[] = [];
  for (let z = minZoom; z <= maxZoom; z++) {
    const xA = lonToTileX(CAMPUS_BOUNDS_LON_LAT.minLon, z);
    const xB = lonToTileX(CAMPUS_BOUNDS_LON_LAT.maxLon, z);
    const yA = latToTileY(CAMPUS_BOUNDS_LON_LAT.maxLat, z);
    const yB = latToTileY(CAMPUS_BOUNDS_LON_LAT.minLat, z);
    for (let x = Math.min(xA, xB); x <= Math.max(xA, xB); x++) {
      for (let y = Math.min(yA, yB); y <= Math.max(yA, yB); y++) {
        coords.push({ z, x, y });
      }
    }
  }
  return coords;
}

export type TileSource = { template: string; maxZoom: number };

let cachedSource: TileSource | null = null;

/**
 * Resolve the MapTiler vector-tile URL template and the source's maxzoom from
 * the map style, following the tiles.json indirection. Reuses the existing key
 * in the style file. Zoom levels above maxZoom are overzoomed client-side, so
 * they must not be prefetched.
 */
export async function getTileTemplate(): Promise<TileSource | null> {
  if (cachedSource) return cachedSource;
  try {
    const style = injectMaptilerKey(
      await (await fetch(CAMPUS_MAP_STYLE_URL)).json(),
    );
    const src = style?.sources?.openmaptiles;
    if (!src) return null;

    if (Array.isArray(src.tiles) && src.tiles[0]) {
      cachedSource = {
        template: src.tiles[0],
        maxZoom: clampMaxZoom(src.maxzoom),
      };
      return cachedSource;
    }
    if (typeof src.url === "string") {
      const tj = await (await fetch(src.url)).json();
      if (Array.isArray(tj?.tiles) && tj.tiles[0]) {
        cachedSource = {
          template: tj.tiles[0],
          maxZoom: clampMaxZoom(tj.maxzoom),
        };
        return cachedSource;
      }
    }
    return null;
  } catch (e) {
    console.error("Failed to resolve tile template:", e);
    return null;
  }
}

function clampMaxZoom(sourceMaxZoom: unknown): number {
  const z = Number(sourceMaxZoom);
  return Number.isFinite(z) ? Math.min(MAX_ZOOM, z) : MAX_ZOOM;
}

export function tileUrl(template: string, { z, x, y }: TileCoord): string {
  return template
    .replace("{z}", String(z))
    .replace("{x}", String(x))
    .replace("{y}", String(y));
}

/** Bytes currently used by the browser for this origin (caches + IndexedDB). */
export async function getStorageUsage(): Promise<number | null> {
  try {
    if (navigator.storage?.estimate) {
      const est = await navigator.storage.estimate();
      return est.usage ?? null;
    }
  } catch {
    // ignore — Storage API unavailable
  }
  return null;
}

/** Delete the offline map caches. */
export async function clearMapCaches(): Promise<void> {
  if (!("caches" in window)) return;
  await caches.delete(OFFLINE_TILE_CACHE);
  await caches.delete(OFFLINE_ASSET_CACHE);
}
