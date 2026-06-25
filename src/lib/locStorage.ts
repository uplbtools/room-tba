// src/lib/locStorage.ts

import type { RecentSearch } from "./types";

const RECENT_SEARCH_CATEGORIES = new Set([
  "building",
  "division",
  "college",
  "room",
  "class",
  "dorm",
  "event",
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
