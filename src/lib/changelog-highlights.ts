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

function sanitizeBullet(raw: string): string {
  return raw
    .replace(/\(\[[^\]]+\]\([^)]+\)\)/g, "")
    .replace(/\[[^\]]+\]\([^)]+\)/g, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}
