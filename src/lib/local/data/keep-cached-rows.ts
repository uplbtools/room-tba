import type { AppContextData } from "@lib/context";

export type LoadedCampusData = Omit<
  Extract<AppContextData, { loaded: true }>,
  "loaded"
>;

export type CampusListKey = Exclude<
  keyof LoadedCampusData,
  "totalRooms" | "directionCount"
>;

const LIST_KEYS: CampusListKey[] = [
  "buildings",
  "colleges",
  "divisions",
  "dorms",
  "events",
  "organizations",
  "places",
];

/**
 * Never let a cache read blank a list that is already on screen.
 *
 * Offline, every table comes back from PGlite, and a table PGlite never
 * stored (evicted IndexedDB, an install that synced before the table
 * existed) reads as []. Applied as-is, that wiped the Dorms list the
 * snapshot had just painted, then saved the hole into the next snapshot.
 * Rows that came from the network are trusted even when empty; only
 * `cachedKeys` (tables answered from the local cache) fall back to what the
 * screen already shows.
 */
export function keepCachedRows(
  current: LoadedCampusData | null,
  next: LoadedCampusData,
  cachedKeys: ReadonlySet<CampusListKey> | "all",
): LoadedCampusData {
  if (!current) return next;
  const merged = { ...next };
  for (const key of LIST_KEYS) {
    const fromCache = cachedKeys === "all" || cachedKeys.has(key);
    if (fromCache && next[key].length === 0 && current[key].length > 0) {
      // Same key on both sides, so the element type always matches.
      (merged as Record<CampusListKey, unknown[]>)[key] = current[key];
    }
  }
  // Room counts fall back to PGlite offline; a campus does not lose every
  // room between two loads.
  if (next.totalRooms === 0 && current.totalRooms > 0) {
    merged.totalRooms = current.totalRooms;
    merged.directionCount = current.directionCount;
  }
  return merged;
}
