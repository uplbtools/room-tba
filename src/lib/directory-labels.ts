/**
 * Display-only labels for the browse directories. Nothing here rewrites
 * stored names: search, URLs and detail panels keep the raw value.
 */

const TRAILING_ACRONYM = /\s*\(([^()]+)\)\s*$/;

/** "School of … (SESAM)" -> { name: "School of …", acronym: "SESAM" }. */
export function splitTrailingAcronym(name: string): {
  name: string;
  acronym: string | null;
} {
  const match = name.match(TRAILING_ACRONYM);
  if (!match?.[1]) return { name, acronym: null };
  return { name: name.slice(0, match.index).trim(), acronym: match[1].trim() };
}

/**
 * A college's short name: its own "(CPAf)" suffix when it has one, else the
 * subdomain of its website (cas.uplb.edu.ph -> CAS), which is how UPLB
 * colleges name themselves.
 */
export function collegeLabel(
  collegeName: string,
  websiteLink: string | null | undefined,
): { name: string; acronym: string | null } {
  const split = splitTrailingAcronym(collegeName);
  if (split.acronym) return split;
  try {
    const host = (websiteLink ? new URL(websiteLink).hostname : "").replace(
      /^www\./i,
      "",
    );
    const sub = host.split(".")[0] ?? "";
    if (host.split(".").length > 2 && /^[a-z]{2,6}$/i.test(sub)) {
      return { name: collegeName, acronym: sub.toUpperCase() };
    }
  } catch {
    // Not a URL: no acronym.
  }
  return { name: collegeName, acronym: null };
}

const MINOR_WORDS = new Set([
  "a",
  "an",
  "and",
  "ang",
  "at",
  "de",
  "for",
  "in",
  "mga",
  "ng",
  "of",
  "on",
  "sa",
  "the",
  "to",
  "y",
]);
/** Words that stay capitalized however the name was typed. */
const KEEP_UPPER = new Set(["UP", "UPLB", "LB", "DOST", "II", "III", "IV"]);

function titleWord(word: string, first: boolean): string {
  if (KEEP_UPPER.has(word.replace(/[^A-Z]/g, ""))) return word;
  const lower = word.toLowerCase();
  if (!first && MINOR_WORDS.has(lower.replace(/[^a-z]/g, ""))) return lower;
  // Capitalize each hyphen/apostrophe-led segment: "taga-hilagang".
  return lower.replace(
    /(^|[-\s])(\p{L})/gu,
    (_, sep, ch) => sep + ch.toUpperCase(),
  );
}

/**
 * ALL-CAPS directory names ("ALLIANCE OF … (UP ADCS)") in title case; the
 * trailing acronym stays as written. Names with any lowercase are already
 * cased by a person, so they are returned untouched.
 */
export function displayOrgName(name: string): string {
  const { name: base, acronym } = splitTrailingAcronym(name);
  // Only the name decides: acronyms like "(UPLB ActSS)" carry lowercase.
  if (/\p{Ll}/u.test(base)) return name;
  const cased = base
    .split(/\s+/)
    .filter(Boolean)
    .map((word, i) => titleWord(word, i === 0))
    .join(" ");
  return acronym ? `${cased} (${acronym})` : cased;
}
