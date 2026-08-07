/**
 * Text + geometry heuristics for the campus data audit
 * (`scripts/audit-campus-data.ts`, `bun run audit:campus-data`).
 *
 * Three data failure modes reached users before anyone swept for them: a room
 * filed under the wrong building, a building pin 159 m from the real building
 * (#886), and an office that simply did not exist in the data. Only the first
 * was ever swept. These helpers are what make the other two detectable: they
 * read the prose the data already carries ("Behind the International House
 * dormitory", "Located at: 2/F Student Union Building") and turn it into a
 * claim that can be checked against the stored coordinates.
 *
 * Pure on purpose, and in `src/lib` rather than next to the script, so
 * `bun run test` covers the heuristics without a database.
 */

import { distanceMeters } from "@lib/campus-route";

export type EntityKind = "building" | "organization" | "place" | "dorm";

/** Anything on campus with a name and a pin, from any of the four tables. */
export type AuditEntity = {
  kind: EntityKind;
  id: number;
  name: string;
  lat: number;
  lon: number;
  /** Short names / acronyms from their own column, e.g. dorms.short_name. */
  aliases?: string[];
};

export const entityRef = (e: AuditEntity): string =>
  `${e.kind}#${e.id} ${e.name}`;

/**
 * Relations that assert the two things are *touching*, so a large distance
 * between the pins is a contradiction rather than loose phrasing.
 *
 * Deliberately excludes "near", "along", "past" and "from": they are true at
 * 300 m and would only add false positives. Longest phrases first, so
 * "in front of" wins over a bare "front of".
 */
const ADJACENCY_RELATIONS = [
  "on the left side of",
  "on the right side of",
  "at the back of",
  "at the foot of",
  "at the base of",
  "in front of",
  "to the left of",
  "to the right of",
  "just across",
  "across from",
  "adjacent to",
  "next to",
  "opposite",
  "fronting",
  "behind",
  "beside",
];

const RELATION_RE = new RegExp(
  String.raw`\b(${ADJACENCY_RELATIONS.join("|")})\s+(?:the\s+)?([^,.;:!?\n]{2,80})`,
  "gi",
);

export type DirectionsReference = {
  /** The relation word as written, lowercased, e.g. "behind". */
  relation: string;
  /** The noun phrase that followed it, untrimmed of trailing filler. */
  phrase: string;
};

/**
 * Pull "<relation> <thing>" claims out of a free-text directions field.
 *
 * The phrase is left as written (e.g. "EE Auditorium facing the field") rather
 * than trimmed to a clean noun phrase; `resolveReference` scores entity names
 * against it, which survives trailing filler better than any truncation rule.
 */
export function parseDirectionsReferences(
  directions: string | null | undefined,
): DirectionsReference[] {
  if (!directions) return [];
  const out: DirectionsReference[] = [];
  for (const m of directions.matchAll(RELATION_RE)) {
    const phrase = m[2].trim();
    if (phrase) out.push({ relation: m[1].toLowerCase(), phrase });
  }
  return out;
}

/**
 * The campus office directory writes host buildings as a "Located at:" tail
 * ("Located at: 3/F Bienvenido M. Gonzalez Hall, main campus."). That tail is
 * the only structured statement of where a tenant claims to be.
 *
 * Stops at the first comma, which is where the host ends and the region filler
 * begins ("…Mendiola Hall, southern main campus"). Keeping the tail is worse
 * than dropping it: "main campus" appears in almost every description and, on
 * the word "main" alone, matched every office to the *CAS Main Building*.
 * Sentence splitting is not an option here, because abbreviations like
 * "F.M. Fronda Hall" would cut the name in half.
 */
export function parseLocatedAt(
  description: string | null | undefined,
): string | null {
  if (!description) return null;
  const m = description.match(/\blocated (?:at|in)\b:?\s*([^,\n]{2,120})/i);
  if (!m) return null;
  const tail = m[1].trim();
  // "Located at: Near CAFS complex" claims proximity, not tenancy, and
  // "Forestry (upper) campus" names a region. Reading either as a host makes
  // every landmark near a building look misplaced.
  return HEDGED_LOCATION.test(tail) || REGION_LOCATION.test(tail) ? null : tail;
}

const HEDGED_LOCATION =
  /^(near|around|close to|in front of|behind|beside|across|between|outside|within|along)\b/i;

/**
 * Once the region filler after the comma is gone, a tail that still says
 * "campus" is describing an area rather than a host building. No real host
 * name in this corpus contains the word.
 */
const REGION_LOCATION = /\bcampus\b/i;

const STOPWORDS = new Set([
  "the",
  "of",
  "and",
  "a",
  "an",
  "at",
  "in",
  "on",
  "for",
  "to",
  "is",
  "this",
  "its",
]);

/** Lowercase word/number tokens, stopwords dropped. Digits matter: "Annex 1". */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 0 && !STOPWORDS.has(t));
}

/**
 * A token shared by this many entity names identifies nothing ("institute",
 * "sciences", "college"). Derived from the corpus so a fork's own naming
 * conventions calibrate themselves.
 */
const GENERIC_DOC_FREQUENCY = 8;

/**
 * Words that describe what a thing *is* rather than which one it is. Generic
 * no matter how small the corpus: a fork with twenty buildings would never
 * reach `GENERIC_DOC_FREQUENCY`, and then "Administration Building" matches
 * "Graduate School Building" on the word "building" alone.
 */
export const STRUCTURAL_TOKENS = new Set([
  "building",
  "buildings",
  "bldg",
  "hall",
  "complex",
  "center",
  "centre",
  "campus",
  "office",
  "university",
  "uplb",
  "up",
]);

/** All-caps acronyms in a name, e.g. "…Registrar (OUR)" -> "OUR". */
function parentheticalAcronyms(name: string): string[] {
  const out: string[] = [];
  for (const m of name.matchAll(/\(([^)]{2,24})\)/g)) {
    const inner = m[1].trim();
    if (/^[A-Z][A-Z0-9&.-]+$/.test(inner)) out.push(inner.replace(/[.-]/g, ""));
  }
  return out;
}

export type NameIndex = {
  entities: AuditEntity[];
  /** Per entity: name tokens rare enough to identify it. */
  distinctive: string[][];
  /** Per entity: uppercase acronyms that must appear uppercase to match. */
  acronyms: string[][];
  /** Per entity: full normalized name, the fallback when nothing is rare. */
  normalized: string[];
};

export function buildNameIndex(entities: AuditEntity[]): NameIndex {
  const tokensPer = entities.map((e) => new Set(tokenize(e.name)));
  const documentFrequency = new Map<string, number>();
  for (const tokens of tokensPer) {
    for (const t of tokens) {
      documentFrequency.set(t, (documentFrequency.get(t) ?? 0) + 1);
    }
  }
  return {
    entities,
    distinctive: tokensPer.map((tokens) =>
      [...tokens].filter(
        (t) =>
          !STRUCTURAL_TOKENS.has(t) &&
          (documentFrequency.get(t) ?? 0) < GENERIC_DOC_FREQUENCY,
      ),
    ),
    acronyms: entities.map((e) => [
      ...parentheticalAcronyms(e.name),
      ...(e.aliases ?? [])
        .filter((a) => /^[A-Za-z0-9&.-]{2,}$/.test(a))
        .map((a) => a.toUpperCase().replace(/[.-]/g, "")),
    ]),
    normalized: entities.map((e) => tokenize(e.name).join(" ")),
  };
}

export type ReferenceMatch = {
  entity: AuditEntity;
  /** Distinctive tokens shared with the phrase, +1 for an acronym hit. */
  score: number;
};

/**
 * A phrase must account for at least this share of the entity's distinctive
 * tokens before it counts as naming it.
 *
 * Without it, "in front of the Administration Building" matches the *Office of
 * the Vice Chancellor for Administration* on the single word "administration"
 * and reports a 419 m contradiction that is really a missing building row.
 * One matched word out of five is a coincidence; two out of three is a name.
 */
const MIN_NAME_COVERAGE = 1 / 3;

/**
 * Best-scoring entities named somewhere inside `phrase`.
 *
 * Returns every entity tied for the top score, not one winner: "Copeland Gym"
 * legitimately matches both the building and the landmark, and a caller that
 * silently picked one would invent a contradiction. Callers should treat the
 * *nearest* candidate as the claim, so an ambiguous reference never fabricates
 * a finding.
 *
 * Acronyms only match when they appear uppercase in the raw phrase, which is
 * what stops "OUR" (Office of the University Registrar) matching the English
 * word in ordinary prose.
 */
export function resolveReference(
  phrase: string,
  index: NameIndex,
  exclude?: { kind: EntityKind; id: number },
): ReferenceMatch[] {
  const phraseTokens = new Set(tokenize(phrase));
  const normalizedPhrase = tokenize(phrase).join(" ");
  const upper = new Set(
    [...phrase.matchAll(/\b[A-Z][A-Z0-9&]+\b/g)].map((m) => m[0]),
  );

  const matches: ReferenceMatch[] = [];
  for (const [i, entity] of index.entities.entries()) {
    if (exclude && entity.kind === exclude.kind && entity.id === exclude.id) {
      continue;
    }
    const distinctive = index.distinctive[i];
    const hits = distinctive.filter((t) => phraseTokens.has(t)).length;
    const acronymHit = index.acronyms[i].some((a) => upper.has(a));
    // Nothing in the name is rare ("Old Makiling School"): fall back to
    // requiring the whole name to appear.
    const wholeNameHit =
      distinctive.length === 0 &&
      index.normalized[i].length > 0 &&
      normalizedPhrase.includes(index.normalized[i]);

    const covered = distinctive.length === 0 ? 1 : hits / distinctive.length;
    if (!acronymHit && !wholeNameHit && covered < MIN_NAME_COVERAGE) continue;

    const score = (wholeNameHit ? 1 : hits) + (acronymHit ? 1 : 0);
    if (score > 0) matches.push({ entity, score });
  }

  const top = Math.max(0, ...matches.map((m) => m.score));
  return matches
    .filter((m) => m.score === top)
    .sort((a, b) => a.entity.id - b.entity.id);
}

/** Metres from `from` to the closest of `candidates`, and which one that was. */
export function nearestOf(
  from: { lat: number; lon: number },
  candidates: AuditEntity[],
): { entity: AuditEntity; meters: number } | null {
  let best: { entity: AuditEntity; meters: number } | null = null;
  for (const entity of candidates) {
    const meters = distanceMeters(from, entity);
    if (!best || meters < best.meters) best = { entity, meters };
  }
  return best;
}

/** Mean position of a set of pins. Campus-scale, so a plain average is fine. */
export function centroid(points: { lat: number; lon: number }[]): {
  lat: number;
  lon: number;
} {
  const lat = points.reduce((s, p) => s + p.lat, 0) / points.length;
  const lon = points.reduce((s, p) => s + p.lon, 0) / points.length;
  return { lat, lon };
}

/** Widest gap between any two of the points, i.e. how tight the cluster is. */
export function spreadMeters(points: { lat: number; lon: number }[]): number {
  let max = 0;
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      max = Math.max(max, distanceMeters(points[i], points[j]));
    }
  }
  return max;
}

/**
 * Group points that sit within `withinMeters` of each other.
 *
 * ponytail: O(n^2) single-link grouping over the ~500 pinned entities on
 * campus, which is instant. Grid-bucket it if a fork ever pins tens of
 * thousands.
 */
export function clusterByProximity<T extends { lat: number; lon: number }>(
  items: T[],
  withinMeters: number,
): T[][] {
  const parent = items.map((_, i) => i);
  const find = (i: number): number => {
    let root = i;
    while (parent[root] !== root) root = parent[root];
    return root;
  };
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (distanceMeters(items[i], items[j]) <= withinMeters) {
        parent[find(j)] = find(i);
      }
    }
  }
  const groups = new Map<number, T[]>();
  for (const [i, item] of items.entries()) {
    const root = find(i);
    groups.set(root, [...(groups.get(root) ?? []), item]);
  }
  return [...groups.values()].filter((g) => g.length > 1);
}
