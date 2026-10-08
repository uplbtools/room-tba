import type {
  BuildingData,
  ClassMapValue,
  DormData,
  EventData,
  OrgData,
  PlaceData,
} from "./types";
import type { QueryStoreState } from "./store.svelte";

/** Query categories, plus the Makiling trail and its stops (not entities). */
export type SuggestionCategory =
  | Exclude<QueryStoreState["category"], null>
  | "trail";

export type Suggestion = {
  value: string;
  category: SuggestionCategory;
  eventSlug?: string;
  building?: BuildingData;
  event?: EventData;
  /** Map pin for "Add stop" while Get Directions is open. */
  lat?: number | null;
  lon?: number | null;
  /** Supporting line under the value (room full name, alias, class room). */
  secondary?: string | null;
  /** Class rows: where selecting it goes (the room, else the course list). */
  courseCode?: string;
  roomCode?: string | null;
  /** Relevance, lower is better (see MATCH). */
  score?: number;
  /** Trail rows: the stop it opens (null = the trail overview). */
  trailStopId?: string | null;
};

/**
 * Relevance tiers, lower is better: exact name / alias / acronym / code, then
 * names that start with the query, then any word that starts with it, then
 * mid-word hits, then description-only hits.
 */
export const MATCH = {
  exact: 0,
  prefix: 1,
  wordPrefix: 2,
  midWord: 3,
  description: 4,
} as const;

const MAX_SUGGESTIONS = 10;
const MAX_PER_CATEGORY = 4;
/** Enter on an ambiguous query lifts the caps so every match is listed. */
export const EXPANDED_LIMITS = { limit: 50, perCategory: 20 } as const;

const ACRONYM_STOPWORDS = new Set([
  "of",
  "and",
  "the",
  "for",
  "in",
  "at",
  "on",
]);

/** "PS 105" and "ps105" are the same code; drop spacing and punctuation. */
function compact(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function acronym(name: string): string {
  return name
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word !== "" && !ACRONYM_STOPWORDS.has(word))
    .map((word) => word[0])
    .join("");
}

function isWordStart(haystack: string, index: number): boolean {
  return index === 0 || !/[a-z0-9]/.test(haystack[index - 1] ?? "");
}

/** Index of the best occurrence: the first word-start hit, else the first hit. */
function bestMatchIndex(haystack: string, needle: string): number {
  let first = -1;
  let index = haystack.indexOf(needle);
  while (index !== -1) {
    if (isWordStart(haystack, index)) return index;
    if (first === -1) first = index;
    index = haystack.indexOf(needle, index + 1);
  }
  return first;
}

/**
 * Relevance of `needle` (already lower-cased and trimmed) inside a display
 * name; see MATCH. null = miss.
 *
 * Mid-word matches used to win on alphabetical order alone: searching "ICS"
 * surfaced Econom-ics- and Kinet-ics- while the ICS building never made the
 * top 8.
 */
export function nameMatchScore(
  name: string | null | undefined,
  needle: string,
): number | null {
  if (!name || needle === "") return null;
  const haystack = name.toLowerCase();
  const compactNeedle = compact(needle);
  const compactHaystack = compact(haystack);
  if (
    haystack === needle ||
    (compactNeedle !== "" && compactHaystack === compactNeedle) ||
    haystack.includes(`(${needle})`) ||
    (compactNeedle.length >= 2 &&
      !/\s/.test(needle) &&
      acronym(haystack) === compactNeedle)
  ) {
    return MATCH.exact;
  }
  const index = bestMatchIndex(haystack, needle);
  if (index === 0) return MATCH.prefix;
  if (index > 0) {
    return isWordStart(haystack, index) ? MATCH.wordPrefix : MATCH.midWord;
  }
  // "cmsc12" against "CMSC 123": same code once spacing is ignored.
  if (compactNeedle !== "" && compactHaystack.startsWith(compactNeedle)) {
    return MATCH.prefix;
  }
  return null;
}

/** Description hits rank behind any name hit. */
function descriptionMatchScore(
  description: string | null | undefined,
  needle: string,
): number | null {
  return description?.toLowerCase().includes(needle) ? MATCH.description : null;
}

function bestScore(...scores: (number | null)[]): number | null {
  const hits = scores.filter((s): s is number => s !== null);
  return hits.length ? Math.min(...hits) : null;
}

/**
 * The part of `label` to bold for `query`: only the matched characters, and
 * only when the match starts a word (so "PS" never lights up "EPSILON", and
 * "(ICS)" bolds "ICS" without the bracket). null = no highlight.
 */
export function matchHighlightRange(
  label: string,
  query: string,
): [number, number] | null {
  const needle = query.trim().toLowerCase();
  if (needle === "") return null;
  const haystack = label.toLowerCase();
  const index = bestMatchIndex(haystack, needle);
  if (index === -1 || !isWordStart(haystack, index)) return null;
  return [index, index + needle.length];
}

const COURSE_CODE_QUERY = /^([A-Za-z]{2,8})\s*(\d{1,4}[A-Za-z]?)$/;

/** "cmsc12" / "CMSC  12" → "CMSC 12"; null when it isn't shaped like a code. */
export function normalizeCourseQuery(query: string): string | null {
  const match = COURSE_CODE_QUERY.exec(query.trim());
  if (!match) return null;
  return `${match[1]?.toUpperCase()} ${match[2]?.toUpperCase()}`;
}

export type EntitySearchData = {
  loaded: boolean;
  filteredBuildings: BuildingData[];
  filteredDorms: DormData[];
  colleges: { collegeName: string }[];
  divisions: { divisionName: string }[];
  events: EventData[];
  organizations: OrgData[];
  places: PlaceData[];
};

function collect<T>(
  items: T[],
  score: (item: T) => number | null,
  map: (item: T) => Suggestion,
): Suggestion[] {
  const out: Suggestion[] = [];
  for (const item of items) {
    const s = score(item);
    if (s === null) continue;
    out.push({ ...map(item), score: s });
  }
  return out;
}

/** Every entity that matches, scored but not yet sorted or capped. */
export function scoreEntities(
  searchString: string,
  data: EntitySearchData,
): Suggestion[] {
  const needle = searchString.trim().toLowerCase();
  if (needle === "" || !data.loaded) return [];
  return [
    ...collect(
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
    ...collect(
      data.colleges,
      ({ collegeName }) => nameMatchScore(collegeName, needle),
      ({ collegeName }) => ({ value: collegeName, category: "college" }),
    ),
    ...collect(
      data.divisions,
      ({ divisionName }) => nameMatchScore(divisionName, needle),
      ({ divisionName }) => ({ value: divisionName, category: "division" }),
    ),
    ...collect(
      data.filteredDorms,
      ({ dormName, shortName }) =>
        bestScore(
          nameMatchScore(dormName, needle),
          nameMatchScore(shortName, needle),
        ),
      (d) => ({ value: d.dormName, category: "dorm", lat: d.lat, lon: d.lon }),
    ),
    ...collect(
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
    ...collect(
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
    ...collect(
      data.places,
      ({ name, description }) =>
        bestScore(
          nameMatchScore(name, needle),
          descriptionMatchScore(description, needle),
        ),
      (p) => ({ value: p.name, category: "place", lat: p.lat, lon: p.lon }),
    ),
  ];
}

/** Building aliases ("PS" → Physical Sciences Building): exact alias = exact. */
export function scoreAliases(
  searchString: string,
  aliases: { alias: string; value: string }[],
  buildings: BuildingData[],
): Suggestion[] {
  const needle = compact(searchString);
  if (needle === "") return [];
  return aliases.map(({ alias, value }) => {
    const building = buildings.find((b) => b.buildingName === value);
    return {
      value,
      category: "building",
      building,
      lat: building?.lat,
      lon: building?.lon,
      secondary: alias,
      score: compact(alias) === needle ? MATCH.exact : MATCH.prefix,
    };
  });
}

export function scoreRooms(
  searchString: string,
  rooms: { value: string; fullName?: string | null }[],
): Suggestion[] {
  const needle = searchString.trim().toLowerCase();
  return collect(
    rooms,
    ({ value, fullName }) =>
      bestScore(
        nameMatchScore(value, needle),
        nameMatchScore(fullName, needle),
      ),
    ({ value, fullName }) => ({
      value,
      category: "room",
      secondary: fullName,
    }),
  );
}

/**
 * Sections of the course the query names. When some sections are exactly the
 * course ("CMSC 12"), longer codes it prefixes ("CMSC 123") are dropped.
 */
export function scoreClasses(
  searchString: string,
  classes: ClassMapValue[],
): Suggestion[] {
  const course = normalizeCourseQuery(searchString);
  if (!course) return [];
  const needle = compact(course);
  const scored = classes
    .filter(
      (row) => row.courseCode && compact(row.courseCode).startsWith(needle),
    )
    .map((row): Suggestion => {
      const courseCode = row.courseCode ?? course;
      return {
        value: [courseCode, row.section].filter(Boolean).join(" "),
        category: "class",
        courseCode,
        roomCode: row.roomCode,
        secondary:
          [row.roomCode ?? "No room listed", row.schedule?.[0]]
            .filter(Boolean)
            .join(", ") || null,
        score: compact(courseCode) === needle ? MATCH.exact : MATCH.prefix,
      };
    });
  return scored.some((s) => s.score === MATCH.exact)
    ? scored.filter((s) => s.score === MATCH.exact)
    : scored;
}

/** Ties at the same score: places people walk to come before people/events. */
const CATEGORY_ORDER: SuggestionCategory[] = [
  "building",
  "room",
  "class",
  "dorm",
  "trail",
  "place",
  "college",
  "division",
  "organization",
  "event",
];

function categoryRank(category: SuggestionCategory): number {
  const index = CATEGORY_ORDER.indexOf(category);
  return index === -1 ? CATEGORY_ORDER.length : index;
}

function suggestionKey(s: Suggestion): string {
  return `${s.category}:${s.eventSlug ?? s.trailStopId ?? s.value}`;
}

/** Dedupe (best score wins), sort by relevance, cap per category and overall. */
export function rankSuggestions(
  scored: Suggestion[],
  {
    limit = MAX_SUGGESTIONS,
    perCategory = MAX_PER_CATEGORY,
  }: { limit?: number; perCategory?: number } = {},
): Suggestion[] {
  const best = new Map<string, Suggestion>();
  for (const s of scored) {
    const key = suggestionKey(s);
    const prior = best.get(key);
    if (!prior || (s.score ?? 99) < (prior.score ?? 99)) {
      // Entities are scored before aliases, so an entity wins a tie; the
      // alias label only shows when the alias is the reason it ranks.
      best.set(key, {
        ...s,
        building: s.building ?? prior?.building,
        lat: s.lat ?? prior?.lat,
        lon: s.lon ?? prior?.lon,
      });
    }
  }
  const sorted = [...best.values()].sort(
    (a, b) =>
      (a.score ?? 99) - (b.score ?? 99) ||
      categoryRank(a.category) - categoryRank(b.category) ||
      a.value.localeCompare(b.value, undefined, {
        numeric: true,
        sensitivity: "base",
      }),
  );
  const perCategoryCount = new Map<SuggestionCategory, number>();
  const out: Suggestion[] = [];
  for (const s of sorted) {
    const count = perCategoryCount.get(s.category) ?? 0;
    if (count >= perCategory) continue;
    perCategoryCount.set(s.category, count + 1);
    out.push(s);
    if (out.length >= limit) break;
  }
  return out;
}

const GROUP_LABEL: Partial<Record<SuggestionCategory, string>> = {
  building: "Places",
  dorm: "Places",
  place: "Places",
  trail: "Places",
  room: "Rooms",
  class: "Classes",
  college: "Offices and orgs",
  division: "Offices and orgs",
  organization: "Offices and orgs",
  event: "Events",
};

export type SuggestionGroup = { label: string | null; items: Suggestion[] };

/**
 * Group a ranked list by type, groups ordered by their best hit. Mid-word and
 * description hits never ride up with a strong group: they trail under "More
 * results", so mid-word matches stay last. A list that ends up as one group
 * stays unlabeled, so headers only appear when they help.
 */
export function groupSuggestions(ranked: Suggestion[]): SuggestionGroup[] {
  const strong = ranked.filter((s) => (s.score ?? 99) < MATCH.midWord);
  const weak = ranked.filter((s) => (s.score ?? 99) >= MATCH.midWord);
  const groups = new Map<string, Suggestion[]>();
  for (const s of strong.length ? strong : weak) {
    const label = GROUP_LABEL[s.category] ?? "Other";
    const items = groups.get(label);
    if (items) items.push(s);
    else groups.set(label, [s]);
  }
  const out: SuggestionGroup[] = [...groups].map(([label, items]) => ({
    label,
    items,
  }));
  if (strong.length && weak.length) {
    out.push({ label: "More results", items: weak });
  }
  if (out.length === 1) return [{ label: null, items: ranked }];
  return out;
}

export type EnterAction =
  | { kind: "select"; suggestion: Suggestion }
  | { kind: "course"; courseCode: string }
  | { kind: "expand" }
  | { kind: "none" };

/**
 * What Enter does for a ranked list: open a clear winner, open the course's
 * class list when the query is a course with several sections, otherwise show
 * every match so the user can pick.
 */
export function enterAction(ranked: Suggestion[]): EnterAction {
  const [top, second] = ranked;
  if (!top) return { kind: "none" };
  if (!second) return { kind: "select", suggestion: top };
  const topScore = top.score ?? 99;
  const secondScore = second.score ?? 99;
  if (top.category === "class" && top.courseCode && topScore === MATCH.exact) {
    const sameCourse = ranked.filter(
      (s) => s.score === MATCH.exact && s.courseCode === top.courseCode,
    );
    if (sameCourse.length > 1) {
      return { kind: "course", courseCode: top.courseCode };
    }
  }
  if (topScore <= MATCH.prefix && secondScore > topScore) {
    return { kind: "select", suggestion: top };
  }
  return { kind: "expand" };
}

/** Entity-only ranking (no aliases, rooms or classes). */
export function buildEntitySuggestions(
  searchString: string,
  data: EntitySearchData,
): Suggestion[] {
  return rankSuggestions(scoreEntities(searchString, data), { limit: 8 });
}
