/**
 * Pure pieces of the Places coordinate audit (#963), split out so they are
 * covered by the bun unit suite (scripts/ itself is not).
 */
import { STRUCTURAL_TOKENS, tokenize } from "../../src/lib/campus-audit";

/**
 * Past this, a pin and Google's location for the same name are telling two
 * different stories. Calibrated against #886: the known-wrong Graduate School
 * pin sits ~190m off, while GPS scatter plus "which door is the entrance"
 * disagreements stay well under 50m on a campus where buildings are 30-80m
 * apart.
 */
export const DEFAULT_FLAG_THRESHOLD_M = 50;

export type PlacesHit = {
  /** Google's displayName.text for the top result. */
  name: string;
  lat: number;
  lon: number;
};

export type Bucket = "aligned" | "flagged" | "unmatched";

/** Campus suffix pins generic names ("Main Library") to Los Baños results. */
export function placesQueryText(buildingName: string): string {
  return `${buildingName}, University of the Philippines Los Baños`;
}

/**
 * Did Places return a plausibly-same-named place? True when the two names
 * share a token that identifies rather than describes ("physical", not
 * "building"). Misses acronym-vs-spelled-out pairs ("CEM Building" vs
 * "College of Economics and Management") — those land in `unmatched` with the
 * returned name printed, and the human reviewing the report resolves them.
 */
export function namesPlausiblyMatch(query: string, returned: string): boolean {
  const distinctive = (token: string) => !STRUCTURAL_TOKENS.has(token);
  const queryTokens = new Set(tokenize(query).filter(distinctive));
  return tokenize(returned)
    .filter(distinctive)
    .some((token) => queryTokens.has(token));
}

/**
 * A result that is missing or wrongly named proves nothing about the pin, so
 * it is never `flagged` — only a confidently-matched, far-away result is.
 */
export function classify(
  hit: PlacesHit | null,
  queryName: string,
  distanceM: number | null,
  thresholdM: number,
): Bucket {
  if (!hit || distanceM === null || !namesPlausiblyMatch(queryName, hit.name)) {
    return "unmatched";
  }
  return distanceM >= thresholdM ? "flagged" : "aligned";
}
