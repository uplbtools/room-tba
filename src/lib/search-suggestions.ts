import type {
  BuildingData,
  DormData,
  EventData,
  OrgData,
  PlaceData,
} from "./types";
import type { QueryStoreState } from "./store.svelte";

type Suggestion = {
  value: string;
  category: Exclude<QueryStoreState["category"], null>;
  eventSlug?: string;
  building?: BuildingData;
  event?: EventData;
  /** Map pin for "Add stop" while Get Directions is open. */
  lat?: number | null;
  lon?: number | null;
};

const MAX_SUGGESTIONS = 8;
const MAX_PER_CATEGORY = 4;

/**
 * Relevance of `needle` inside a display name; lower is better, null = miss.
 * 0 exact name or exact parenthesized acronym, 1 word-start, 2 mid-word.
 */
export function nameMatchScore(
  name: string | null | undefined,
  needle: string,
): number | null {
  if (!name) return null;
  const haystack = name.toLowerCase();
  const index = haystack.indexOf(needle);
  if (index === -1) return null;
  if (haystack === needle || haystack.includes(`(${needle})`)) return 0;
  const before = index === 0 ? "" : (haystack[index - 1] ?? "");
  return before === "" || !/[a-z0-9]/.test(before) ? 1 : 2;
}

function descriptionMatchScore(
  description: string | null | undefined,
  needle: string,
): number | null {
  return description?.toLowerCase().includes(needle) ? 3 : null;
}

function bestScore(...scores: (number | null)[]): number | null {
  const hits = scores.filter((s): s is number => s !== null);
  return hits.length ? Math.min(...hits) : null;
}

type Scored = { score: number; suggestion: Suggestion };

function takeMatches<T>(
  items: T[],
  score: (item: T) => number | null,
  map: (item: T) => Suggestion,
  limit = MAX_PER_CATEGORY,
): Scored[] {
  const out: Scored[] = [];
  for (const item of items) {
    const s = score(item);
    if (s === null) continue;
    out.push({ score: s, suggestion: map(item) });
  }
  return out
    .sort(
      (a, b) =>
        a.score - b.score ||
        a.suggestion.value
          .toLowerCase()
          .localeCompare(b.suggestion.value.toLowerCase()),
    )
    .slice(0, limit);
}

/** Building-only picker using exactly the same name relevance as global search. */
export function buildBuildingSuggestions(
  searchString: string,
  buildings: BuildingData[],
  limit = MAX_SUGGESTIONS,
): BuildingData[] {
  const needle = searchString.trim().toLowerCase();
  if (!needle || limit <= 0) return [];
  return takeMatches(
    buildings,
    ({ buildingName }) => nameMatchScore(buildingName, needle),
    (building) => ({
      value: building.buildingName,
      category: "building",
      building,
      lat: building.lat,
      lon: building.lon,
    }),
    limit,
  )
    .map(({ suggestion }) => suggestion.building)
    .filter((building): building is BuildingData => building !== undefined);
}

export function buildEntitySuggestions(
  searchString: string,
  data: {
    loaded: boolean;
    filteredBuildings: BuildingData[];
    filteredDorms: DormData[];
    colleges: { collegeName: string }[];
    divisions: { divisionName: string }[];
    events: EventData[];
    organizations: OrgData[];
    places: PlaceData[];
  },
): Suggestion[] {
  const needle = searchString.trim().toLowerCase();
  if (needle === "" || !data.loaded) return [];

  const suggestions = [
    ...takeMatches(
      data.filteredBuildings,
      ({ buildingName }) => nameMatchScore(buildingName, needle),
      (b) => ({
        value: b.buildingName,
        category: "building",
        building: b,
        lat: b.lat,
        lon: b.lon,
      }),
    ),
    ...takeMatches(
      data.colleges,
      ({ collegeName }) => nameMatchScore(collegeName, needle),
      ({ collegeName }) => ({ value: collegeName, category: "college" }),
    ),
    ...takeMatches(
      data.divisions,
      ({ divisionName }) => nameMatchScore(divisionName, needle),
      ({ divisionName }) => ({ value: divisionName, category: "division" }),
    ),
    ...takeMatches(
      data.filteredDorms,
      ({ dormName, shortName }) =>
        bestScore(
          nameMatchScore(dormName, needle),
          nameMatchScore(shortName, needle),
        ),
      (d) => ({
        value: d.dormName,
        category: "dorm",
        lat: d.lat,
        lon: d.lon,
      }),
    ),
    ...takeMatches(
      data.events,
      ({ title, description }) =>
        bestScore(
          nameMatchScore(title, needle),
          descriptionMatchScore(description, needle),
        ),
      (e) => ({
        value: e.title,
        category: "event",
        eventSlug: e.slug,
        event: e,
      }),
    ),
    ...takeMatches(
      data.organizations,
      ({ name, description }) =>
        bestScore(
          nameMatchScore(name, needle),
          descriptionMatchScore(description, needle),
        ),
      (o) => ({
        value: o.name,
        category: "organization",
        lat: o.lat,
        lon: o.lon,
      }),
    ),
    ...takeMatches(
      data.places,
      ({ name, description }) =>
        bestScore(
          nameMatchScore(name, needle),
          descriptionMatchScore(description, needle),
        ),
      (p) => ({
        value: p.name,
        category: "place",
        lat: p.lat,
        lon: p.lon,
      }),
    ),
  ];

  return suggestions
    .sort(
      (a, b) =>
        a.score - b.score ||
        a.suggestion.value
          .toLowerCase()
          .localeCompare(b.suggestion.value.toLowerCase()),
    )
    .slice(0, MAX_SUGGESTIONS)
    .map(({ suggestion }) => suggestion);
}
