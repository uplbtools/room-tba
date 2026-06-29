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

const requiredDenylist = [
  String.raw`/^\/privacy(\/|$)/`,
  String.raw`/^\/terms(\/|$)/`,
  String.raw`/^\/changelog(\/|$)/`,
];

let failed = false;

for (const pattern of requiredPrecache) {
  if (!source.includes(`"${pattern}"`)) {
    console.error(`Missing globPatterns precache entry: ${pattern}`);
    failed = true;
  }
}

for (const pattern of requiredDenylist) {
  if (!source.includes(pattern)) {
    console.error(`Missing navigateFallbackDenylist entry: ${pattern}`);
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
