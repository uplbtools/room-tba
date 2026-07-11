/**
 * Regenerates src/generated/release-timestamps.json from GitHub releases so
 * the changelog can show the exact publish time per release.
 *
 * Never fails the build: on any error the committed JSON is left as-is and the
 * UI falls back to the date parsed from CHANGELOG.md headings.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = join(
  import.meta.dir,
  "..",
  "src",
  "generated",
  "release-timestamps.json",
);
const API =
  "https://api.github.com/repos/uplbtools/room-tba/releases?per_page=100";

type Release = { tag_name?: string; published_at?: string };

try {
  const map: Record<string, string> = {};
  for (let page = 1; page <= 5; page++) {
    const res = await fetch(`${API}&page=${page}`, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!res.ok) throw new Error(`GitHub API ${res.status}`);
    const releases = (await res.json()) as Release[];
    if (!Array.isArray(releases) || releases.length === 0) break;
    for (const release of releases) {
      const version = release.tag_name?.replace(/^v/, "");
      if (version && release.published_at) map[version] = release.published_at;
    }
    if (releases.length < 100) break;
  }
  if (Object.keys(map).length === 0) throw new Error("no releases returned");
  writeFileSync(OUT, `${JSON.stringify(map, null, 2)}\n`);
  console.log(`release-timestamps: wrote ${Object.keys(map).length} entries`);
} catch (error) {
  console.warn(
    `release-timestamps: keeping committed file (${error instanceof Error ? error.message : error})`,
  );
}
