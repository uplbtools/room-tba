export type ChangelogHighlight = {
  version: string;
  items: string[];
  totalCount: number;
};

const VERSION_HEADING = /^#{1,2} \[([^\]]+)\]/;
// Prettier rewrites "* item" bullets to "- item"; accept both.
const BULLET = /^[*-] (.+)$/;

/** Human-readable bullets for the update prompt (#212). */
export function parseChangelogHighlights(
  markdown: string,
  options?: { maxItems?: number },
): ChangelogHighlight | null {
  const maxItems = options?.maxItems ?? 5;
  const lines = markdown.split(/\r?\n/);
  let version: string | null = null;
  const bullets: string[] = [];

  for (const line of lines) {
    const versionMatch = line.match(VERSION_HEADING);
    if (versionMatch) {
      if (version !== null) break;
      version = versionMatch[1] ?? null;
      continue;
    }
    if (version === null) continue;

    const bulletMatch = line.match(BULLET);
    if (bulletMatch?.[1]) {
      bullets.push(sanitizeBullet(bulletMatch[1]));
    }
  }

  if (!version || bullets.length === 0) return null;

  return {
    version,
    items: bullets.slice(0, maxItems),
    totalCount: bullets.length,
  };
}

export type ChangelogEntry = {
  version: string;
  date: string | null;
  sections: { title: string; items: string[] }[];
};

/** Every release in the changelog, for the in-app full-changelog view. */
export function parseChangelogEntries(markdown: string): ChangelogEntry[] {
  const entries: ChangelogEntry[] = [];
  let entry: ChangelogEntry | null = null;
  let section: ChangelogEntry["sections"][number] | null = null;

  for (const line of markdown.split(/\r?\n/)) {
    const versionMatch = line.match(VERSION_HEADING);
    if (versionMatch?.[1]) {
      entry = {
        version: versionMatch[1],
        date: line.match(/\((\d{4}-\d{2}-\d{2})\)\s*$/)?.[1] ?? null,
        sections: [],
      };
      section = null;
      entries.push(entry);
      continue;
    }
    if (!entry) continue;

    const sectionMatch = line.match(/^### (.+)$/);
    if (sectionMatch?.[1]) {
      section = { title: sectionMatch[1].trim(), items: [] };
      entry.sections.push(section);
      continue;
    }

    const bulletMatch = line.match(BULLET);
    if (bulletMatch?.[1]) {
      // Releases without "###" sections list bullets directly under the version.
      if (!section) {
        section = { title: "", items: [] };
        entry.sections.push(section);
      }
      section.items.push(sanitizeBullet(bulletMatch[1]));
    }
  }

  return entries.filter((e) => e.sections.some((s) => s.items.length > 0));
}

/** Commit scopes that describe the repo (tests, CI, tooling), not the app. */
const INTERNAL_SCOPES = new Set([
  "agent-tooling",
  "backup",
  "batch",
  "build",
  "chore",
  "ci",
  "db",
  "deps",
  "docs",
  "e2e",
  "e2e-reset",
  "infra",
  "lint",
  "ops",
  "refactor",
  "scripts",
  "store",
  "test",
  "tests",
  "tsconfig",
]);

/** Clause-level developer jargon ("mobile pixel pass", "spec label drift"). */
const JARGON =
  /(?<![\w-])(e2e|specs?|(test )?suite|lint|biome|tsc|typecheck|refactor|chore|ci|vitest|playwright|(pixel|ui) pass|flaky|fixtures?|deps|jakob('s)?(-law)?|audit|heuristics?|\d+ items)\b/i;

/** "mobile UI pass: transit off campus" leads with how it was made, not what. */
const PROCESS_PREFIX = /^[^:]{0,40}\bpass:\s+/i;

const SECTION_TITLES: Record<string, string> = {
  "Bug Fixes": "Fixes",
  Features: "New",
  "Performance Improvements": "Faster",
};

/**
 * Reword one bullet for students, or null when it is developer-only. Drops
 * the "scope:" prefix, entries whose scopes are all internal, and jargon
 * clauses inside an otherwise user-facing summary.
 */
export function userFacingItem(item: string): string | null {
  const scoped = item.match(/^([\w.,+/-]+):\s+(.+)$/);
  let text = item;
  if (scoped?.[1] && scoped[2]) {
    const scopes = scoped[1].split(/[+,/]/);
    if (scopes.every((scope) => INTERNAL_SCOPES.has(scope))) return null;
    text = scoped[2];
  }
  // sanitizeBullet strips the issue links, leaving a bare "closes" tail.
  // Parentheticals that only name the process ("(Jakob's-law audit, 30
  // items)") go; the summary before them stays.
  const clauses = text
    .replace(/\s*,\s*closes$/i, "")
    .replace(/\s*\(([^)]*)\)/g, (match, inner: string) =>
      JARGON.test(inner) ? "" : match,
    )
    .replace(PROCESS_PREFIX, "")
    .split(/(?<=[,;])\s+/);
  // The lead clause carries the meaning; jargon there means the whole entry
  // is developer-facing. Later jargon clauses are trimmed off.
  if (!clauses[0] || JARGON.test(clauses[0])) return null;
  const kept = clauses
    .filter((clause) => !JARGON.test(clause))
    .join(" ")
    .replace(/[,;]\s*$/, "")
    .trim();
  return kept.charAt(0).toUpperCase() + kept.slice(1);
}

/**
 * The in-app "What's new" view: the same releases, minus developer-only
 * bullets, with plain section names. CHANGELOG.md itself is untouched.
 */
export function userFacingEntries(entries: ChangelogEntry[]): ChangelogEntry[] {
  return entries
    .map((entry) => ({
      ...entry,
      sections: entry.sections
        .map((section) => ({
          title: SECTION_TITLES[section.title] ?? section.title,
          items: section.items
            .map(userFacingItem)
            .filter((item): item is string => item !== null),
        }))
        .filter((section) => section.items.length > 0),
    }))
    .filter((entry) => entry.sections.length > 0);
}

/** Compare dotted numeric versions ("1.31.1"); returns <0, 0, or >0. */
function compareVersions(a: string, b: string): number {
  const parse = (v: string) =>
    v
      .replace(/^v/i, "")
      .split(".")
      .map((n) => Number.parseInt(n, 10) || 0);
  const pa = parse(a);
  const pb = parse(b);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/**
 * The changelog highlights are only trustworthy for the running app when the
 * newest CHANGELOG entry is at least the app version. When package.json is
 * bumped without regenerating CHANGELOG.md (a stale changelog), the highlights
 * lag the real version and must not be shown as "what's new" — otherwise the
 * update prompt claims a version older than the one already installed.
 */
export function isChangelogCurrent(
  changelogVersion: string,
  appVersion: string,
): boolean {
  return compareVersions(changelogVersion, appVersion) >= 0;
}

function sanitizeBullet(raw: string): string {
  return raw
    .replace(/\(\[[^\]]+\]\([^)]+\)\)/g, "")
    .replace(/\[[^\]]+\]\([^)]+\)/g, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}
