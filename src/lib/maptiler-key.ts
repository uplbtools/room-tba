/** Placeholder in committed map assets — replaced at runtime with PUBLIC_MAPTILER_KEY. */
import { setBasemapProvider } from "./basemap-provider";

export const MAPTILER_KEY_PLACEHOLDER = "__MAPTILER_KEY__";

/** MapTiler client key — set PUBLIC_MAPTILER_KEY in .env (domain-restricted on MapTiler). */
export function getMaptilerKey(): string {
  const key = import.meta.env.PUBLIC_MAPTILER_KEY;
  if (!key) {
    throw new Error("PUBLIC_MAPTILER_KEY is not set");
  }
  return key;
}

export function applyMaptilerKeyToText(text: string, key: string): string {
  return text.replaceAll(MAPTILER_KEY_PLACEHOLDER, key);
}

/** Inject the runtime key into URLs or style JSON that use __MAPTILER_KEY__ placeholders. */
export function withMaptilerKey(value: string): string {
  return applyMaptilerKeyToText(value, getMaptilerKey());
}

/** Inject the runtime key into a map style JSON that uses __MAPTILER_KEY__ placeholders. */
export function injectMaptilerKey<T>(style: T): T {
  return JSON.parse(withMaptilerKey(JSON.stringify(style))) as T;
}

export const CAMPUS_MAP_STYLE_URL = "/liberty-customized.json";

/**
 * OpenFreeMap positron — vector, styled, and keyless. Serves whenever the
 * campus style cannot be: no key configured, or a key MapTiler rejects (#863).
 */
export const FALLBACK_MAP_STYLE_URL =
  "https://tiles.openfreemap.org/styles/positron";

/**
 * Last resort when even the fallback host is unreachable (CI without egress,
 * a first load with no connection). Raster, no external style fetch.
 */
const OFFLINE_FALLBACK_MAP_STYLE = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
} as const;

const TILE_PROBE_TIMEOUT_MS = 6_000;

/** A key is configured. Says nothing about whether MapTiler will accept it. */
export function hasConfiguredMaptilerKey(): boolean {
  const key = import.meta.env.PUBLIC_MAPTILER_KEY?.trim();
  return Boolean(key && key.length > 8);
}

/**
 * Is the keyed tile source actually served?
 *
 * liberty-customized.json comes from our own origin, so it loads fine even
 * when the key is dead — wrapping *that* fetch in try/catch never sees the
 * outage. It is the MapTiler TileJSON behind it that 403s on a revoked,
 * throttled, or domain-restricted key, and MapLibre then draws a blank
 * basemap under working pins (#863). Probe the URL the style itself names so
 * this can never drift from liberty-customized.json.
 */
async function maptilerTilesReachable(style: unknown): Promise<boolean> {
  const url = (style as { sources?: Record<string, { url?: string }> })?.sources
    ?.openmaptiles?.url;
  if (!url) return true;

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(TILE_PROBE_TIMEOUT_MS),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/** Keyless basemap: OpenFreeMap, or bare raster when that is unreachable too. */
async function loadFallbackMapStyle<T>(): Promise<T> {
  try {
    const response = await fetch(FALLBACK_MAP_STYLE_URL, {
      signal: AbortSignal.timeout(TILE_PROBE_TIMEOUT_MS),
    });
    if (response.ok) {
      setBasemapProvider("openfreemap");
      return (await response.json()) as T;
    }
  } catch {
    // No network for the fallback either — fall through to raster.
  }
  setBasemapProvider("osm-raster");
  return OFFLINE_FALLBACK_MAP_STYLE as T;
}

/** Load the campus MapLibre style with the runtime MapTiler key applied. */
export async function loadCampusMapStyle<T>(): Promise<T> {
  if (!hasConfiguredMaptilerKey()) {
    return loadFallbackMapStyle<T>();
  }

  const res = await fetch(CAMPUS_MAP_STYLE_URL);
  if (!res.ok) {
    throw new Error(`Failed to load map style (${res.status})`);
  }
  const style = injectMaptilerKey((await res.json()) as T);

  if (!(await maptilerTilesReachable(style))) {
    console.warn(
      "MapTiler rejected the configured key; falling back to a keyless basemap.",
    );
    return loadFallbackMapStyle<T>();
  }

  setBasemapProvider("maptiler");
  return style;
}
