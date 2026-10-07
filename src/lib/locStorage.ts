// src/lib/locStorage.ts

import type { RecentSearch } from "@lib/types";

const RECENT_SEARCH_CATEGORIES = new Set([
  "building",
  "division",
  "college",
  "room",
  "class",
  "dorm",
  "event",
  "events",
]);

export const isRecentSearch = (
  recentSearch: unknown,
): recentSearch is RecentSearch =>
  !!recentSearch &&
  typeof recentSearch === "object" &&
  "value" in recentSearch &&
  typeof (recentSearch as RecentSearch).value === "string" &&
  "category" in recentSearch &&
  typeof (recentSearch as RecentSearch).category === "string" &&
  RECENT_SEARCH_CATEGORIES.has((recentSearch as RecentSearch).category);

/**
 * Parsed JSON from localStorage, or `fallback` when the key is missing, the
 * value is corrupt, or storage is unavailable (SSR, private mode, blocked).
 */
export function readLocalJson<T>(key: string, fallback: T): T {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

/** Best effort: a full or blocked storage must never break the caller. */
export function writeLocalJson(key: string, value: unknown): void {
  try {
    globalThis.localStorage?.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded or storage disabled; the in-memory state still works.
  }
}
