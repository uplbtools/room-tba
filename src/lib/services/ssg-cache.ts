/**
 * Build-time cache for SSG entity data.
 *
 * During Astro builds, getStaticPaths() is called for each entity type.
 * This cache deduplicates repeated DB queries across pages.
 *
 * #331 - Minimize build and deploy time
 */

import type {
  BuildingData,
  CollegeData,
  DivisionData,
  DormData,
  EventData,
  PlaceData,
  RoomData,
} from "@lib/types";

interface SSGCache {
  buildings: BuildingData[] | null;
  rooms: RoomData[] | null;
  colleges: CollegeData[] | null;
  divisions: DivisionData[] | null;
  dorms: DormData[] | null;
  events: EventData[] | null;
  places: PlaceData[] | null;
  defaultTerm: { id: number; label: string } | null;
  classCounts: Map<string, number>;
  roomClassCounts: Map<string, number>;
}

const cache: SSGCache = {
  buildings: null,
  rooms: null,
  colleges: null,
  divisions: null,
  dorms: null,
  events: null,
  places: null,
  defaultTerm: null,
  classCounts: new Map(),
  roomClassCounts: new Map(),
};

export function getBuildCache() {
  return cache;
}

export function clearBuildCache() {
  cache.buildings = null;
  cache.rooms = null;
  cache.colleges = null;
  cache.divisions = null;
  cache.dorms = null;
  cache.events = null;
  cache.places = null;
  cache.defaultTerm = null;
  cache.classCounts.clear();
  cache.roomClassCounts.clear();
}

// Helper to cache class counts by composite key
export function getCachedClassCountKey(
  buildingId: number,
  termId: number,
): string {
  return `${buildingId}:${termId}`;
}

export function getCachedRoomClassCountKey(
  roomId: number,
  termId: number,
): string {
  return `${roomId}:${termId}`;
}
