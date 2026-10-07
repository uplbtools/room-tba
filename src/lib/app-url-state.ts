/**
 * Map state that lives in the URL (Jakob audit macro 2), as pure encode and
 * decode helpers so the directions UI, search and the map share one format:
 *
 *   /?q=physci                     search text with suggestions open
 *   /?browse=dorms                 a category list (map chip)
 *   /?dir=me/physical-sciences-building
 *                                  directions; each end is `me` (GPS), a
 *                                  campus slug, or `lat,lng`
 *   #map=17.25/14.16523/121.24151  camera: zoom/lat/lng (OSM style)
 *
 * Entity pages keep their own paths (/building/…); see entity-urls.ts.
 */
import type { CampusBrowseTab } from "./browse-campus-shared";
import { normalizePathname, parseEntityPathname } from "./entity-urls";

export type BrowseParam = CampusBrowseTab | "events" | "classes";

const BROWSE_PARAMS = [
  "buildings",
  "dorms",
  "colleges",
  "divisions",
  "organizations",
  "offices",
  "landmarks",
  "services",
  "jeepney",
  "events",
  "classes",
] as const satisfies readonly BrowseParam[];

export function parseBrowseParam(value: string | null): BrowseParam | null {
  return value && (BROWSE_PARAMS as readonly string[]).includes(value)
    ? (value as BrowseParam)
    : null;
}

export type DirectionsToken =
  | { kind: "me" }
  | { kind: "coords"; lat: number; lng: number }
  | { kind: "slug"; slug: string };

const COORD_DECIMALS = 6;

function roundTo(value: number, decimals: number) {
  return Number(value.toFixed(decimals));
}

export function formatDirectionsToken(token: DirectionsToken): string {
  switch (token.kind) {
    case "me":
      return "me";
    case "coords":
      return `${roundTo(token.lat, COORD_DECIMALS)},${roundTo(token.lng, COORD_DECIMALS)}`;
    case "slug":
      return token.slug;
  }
}

const COORDS_PATTERN = /^(-?\d{1,2}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)$/;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function parseDirectionsToken(raw: string): DirectionsToken | null {
  const value = raw.trim();
  if (value === "me") return { kind: "me" };
  const coords = value.match(COORDS_PATTERN);
  if (coords) {
    const lat = Number(coords[1]);
    const lng = Number(coords[2]);
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
    return { kind: "coords", lat, lng };
  }
  if (SLUG_PATTERN.test(value)) return { kind: "slug", slug: value };
  return null;
}

export type DirectionsParam = { from: DirectionsToken; to: DirectionsToken };

export function formatDirectionsParam(param: DirectionsParam): string {
  return `${formatDirectionsToken(param.from)}/${formatDirectionsToken(param.to)}`;
}

export function parseDirectionsParam(
  value: string | null,
): DirectionsParam | null {
  if (!value) return null;
  const [fromRaw, toRaw, extra] = value.split("/");
  if (fromRaw === undefined || toRaw === undefined || extra !== undefined) {
    return null;
  }
  const from = parseDirectionsToken(fromRaw);
  const to = parseDirectionsToken(toRaw);
  if (!from || !to) return null;
  // Directions *to* the rider's own position mean nothing.
  if (to.kind === "me") return null;
  return { from, to };
}

export type MapCamera = { zoom: number; lat: number; lng: number };

export function formatMapHash(camera: MapCamera): string {
  return `#map=${camera.zoom.toFixed(2)}/${camera.lat.toFixed(5)}/${camera.lng.toFixed(5)}`;
}

export function parseMapHash(hash: string): MapCamera | null {
  const match = hash.match(
    /^#?map=(\d{1,2}(?:\.\d+)?)\/(-?\d{1,2}(?:\.\d+)?)\/(-?\d{1,3}(?:\.\d+)?)$/,
  );
  if (!match) return null;
  const zoom = Number(match[1]);
  const lat = Number(match[2]);
  const lng = Number(match[3]);
  if (zoom > 24 || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { zoom, lat, lng };
}

export type AppStateParams = {
  q?: string | null;
  dir?: string | null;
  browse?: string | null;
};

const STATE_KEYS = ["q", "dir", "browse"] as const;

/** URLSearchParams escapes `/` and `,`; both are legal in a query and read better unescaped. */
function serializeSearch(params: URLSearchParams) {
  const text = params.toString().replace(/%2F/gi, "/").replace(/%2C/gi, ",");
  return text ? `?${text}` : "";
}

/**
 * Set (or with null/"" remove) app-state params on a path+search+hash URL.
 * Other params (?term=) and the hash are kept.
 */
export function withAppState(url: string, updates: AppStateParams): string {
  const hashIndex = url.indexOf("#");
  const hash = hashIndex >= 0 ? url.slice(hashIndex) : "";
  const beforeHash = hashIndex >= 0 ? url.slice(0, hashIndex) : url;
  const searchIndex = beforeHash.indexOf("?");
  const pathname =
    searchIndex >= 0 ? beforeHash.slice(0, searchIndex) : beforeHash;
  const params = new URLSearchParams(
    searchIndex >= 0 ? beforeHash.slice(searchIndex) : "",
  );
  for (const key of STATE_KEYS) {
    if (!(key in updates)) continue;
    const value = updates[key];
    if (value) params.set(key, value);
    else params.delete(key);
  }
  return `${pathname}${serializeSearch(params)}${hash}`;
}

/** Replace the hash; null removes it. */
export function withHash(url: string, hash: string | null): string {
  const hashIndex = url.indexOf("#");
  const base = hashIndex >= 0 ? url.slice(0, hashIndex) : url;
  return hash ? `${base}${hash}` : base;
}

export function readAppState(search: string) {
  const params = new URLSearchParams(search);
  return {
    q: params.get("q")?.trim() || null,
    dir: parseDirectionsParam(params.get("dir")),
    browse: parseBrowseParam(params.get("browse")),
  };
}

/**
 * Search without the params that ride on top of any page (?q=, ?dir=), so
 * entity URL sync does not mistake them for a different page and push one.
 */
export function stripOverlayParams(search: string): string {
  const params = new URLSearchParams(search);
  params.delete("q");
  params.delete("dir");
  return serializeSearch(params);
}

/** Top-level paths something real answers (app screens, server pages, assets). */
const KNOWN_SECTIONS = new Set([
  "admin",
  "api",
  "building",
  "calendar",
  "changelog",
  "college",
  "discord",
  "division",
  "donate",
  "dorm",
  "establishment",
  "event",
  "faq",
  "final-exams",
  "fork",
  "landmark",
  "maintain",
  "messenger",
  "og.png",
  "organization",
  "planner",
  "privacy",
  "pubmat",
  "reset-password",
  "room",
  "route",
  "sitemap.xml",
  "sponsors",
  "terms",
  "today",
  "transit",
  "transparency",
  "unit",
  "wiki",
]);

/**
 * True when the app shell was served for a path nothing in the app answers
 * (`/this-does-not-exist`). Entity paths with an unknown slug are checked
 * against loaded data instead (see entity-url-sync).
 */
export function isUnknownAppPath(pathname: string): boolean {
  const normalized = normalizePathname(pathname);
  if (normalized === "/") return false;
  if (parseEntityPathname(normalized)) return false;
  const first = normalized.split("/").filter(Boolean)[0] ?? "";
  return !KNOWN_SECTIONS.has(first);
}
