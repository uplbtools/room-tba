// Crawls built wiki HTML and reports internal links that do not resolve:
// a missing page, or a #fragment with no matching id on the target page.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

export type BrokenLink = { from: string; href: string; reason: string };

export function extractHrefs(html: string): string[] {
  return [...html.matchAll(/<a\s[^>]*?href="([^"]*)"/g)].map((m) => m[1]!);
}

export function extractIds(html: string): Set<string> {
  return new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]!));
}

/** dist file for a site path, or null when nothing is served there. */
export function resolveBuiltFile(distDir: string, pathname: string): string | null {
  const clean = decodeURIComponent(pathname).replace(/^\/+/, "");
  const candidates = [
    join(distDir, clean, "index.html"),
    join(distDir, clean),
    join(distDir, `${clean}.html`),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

export function listHtmlFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listHtmlFiles(full));
    else if (entry.name.endsWith(".html")) out.push(full);
  }
  return out;
}

/**
 * Checks every internal link on every page under `distDir/<startPath>`.
 * `knownElsewhere` are site paths served by something other than a static
 * file (server routes, redirects) that count as present.
 */
export function checkWikiLinks(
  distDir: string,
  startPath = "wiki",
  knownElsewhere: readonly RegExp[] = [],
): BrokenLink[] {
  const broken: BrokenLink[] = [];
  const idCache = new Map<string, Set<string>>();
  const idsOf = (file: string) => {
    let ids = idCache.get(file);
    if (!ids) {
      ids = extractIds(readFileSync(file, "utf8"));
      idCache.set(file, ids);
    }
    return ids;
  };

  for (const file of listHtmlFiles(join(distDir, startPath))) {
    const html = readFileSync(file, "utf8");
    const from = `/${file.slice(distDir.length + 1).replace(/index\.html$/, "")}`;
    for (const href of new Set(extractHrefs(html))) {
      if (!href || /^(https?:|mailto:|tel:|data:|javascript:)/.test(href)) continue;
      const url = new URL(href, `https://example.test${from}`);
      if (url.host !== "example.test") continue;
      const target = url.pathname === from ? file : resolveBuiltFile(distDir, url.pathname);
      if (!target) {
        if (knownElsewhere.some((pattern) => pattern.test(url.pathname))) continue;
        broken.push({ from, href, reason: "page not found" });
        continue;
      }
      const fragment = decodeURIComponent(url.hash.slice(1));
      if (fragment && !idsOf(target).has(fragment)) {
        broken.push({ from, href, reason: `no element with id "${fragment}"` });
      }
    }
  }
  return broken;
}
