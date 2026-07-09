/**
 * Guardrail: legal/static pages must stay precached and denylisted from
 * Workbox navigateFallback (fixes #321, #322, #323).
 *
 * Run: bun run check:pwa-legal
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const configPath = resolve(import.meta.dir, "../astro.config.mjs");
const source = readFileSync(configPath, "utf8");

const requiredPrecache = [
  "privacy/index.html",
  "terms/index.html",
  "changelog/index.html",
];

// Match the anchored route stem only, not the trailing boundary group — the
// group varies (e.g. `(\/|$)` vs `(\/|\?|$)` once search strings are covered)
// and hard-coding it made this guardrail break on unrelated denylist edits.
const requiredDenylistRoutes = [
  "privacy",
  "terms",
  "changelog",
  "messenger",
  "maintain",
  "discord",
];

let failed = false;

for (const pattern of requiredPrecache) {
  if (!source.includes(`"${pattern}"`)) {
    console.error(`Missing globPatterns precache entry: ${pattern}`);
    failed = true;
  }
}

for (const route of requiredDenylistRoutes) {
  const anchored = String.raw`/^\/${route}(`;
  if (!source.includes(anchored)) {
    console.error(`Missing navigateFallbackDenylist entry for /${route}`);
    failed = true;
  }
}

if (!source.includes('navigateFallback: "/"')) {
  console.error('Expected navigateFallback: "/" for offline app shell');
  failed = true;
}

if (failed) {
  process.exit(1);
}

console.log("PWA legal route guardrails OK");
