export type ChangelogHighlight = {
  version: string;
  items: string[];
  totalCount: number;
};

const VERSION_HEADING = /^# \[([^\]]+)\]/;

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

    const bulletMatch = line.match(/^\* (.+)$/);
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
