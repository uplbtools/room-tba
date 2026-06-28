/**
 * Fail if README.md contains known-stale onboarding facts.
 * Run: bun run check:readme
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const readmePath = join(import.meta.dir, "..", "README.md");
const readme = readFileSync(readmePath, "utf8");

const banned: { pattern: RegExp; hint: string }[] = [
  {
    pattern: /NEON_CONNECTION_STRING/i,
    hint: "Runtime DB is Supabase via DATABASE_URL — not Neon.",
  },
  {
    pattern: /data is stored in the info\.db/i,
    hint: "Postgres (Supabase) is runtime DB; mention info.db only as legacy seed/export.",
  },
  {
    pattern: /may be accessed using sqlite/i,
    hint: "Drizzle Studio connects to Postgres when DATABASE_URL is set.",
  },
  {
    pattern: /\/src\/routes/i,
    hint: "Astro routes live under src/pages/.",
  },
  {
    pattern: /\bnpm install\b/i,
    hint: "Package manager is Bun (bun install).",
  },
  {
    pattern: /Astro 6/i,
    hint: "Match the Astro major version in package.json (currently Astro 7).",
  },
  {
    pattern: /no automated test suite/i,
    hint: "Document bun test src; CI runs unit tests.",
  },
];

const failures = banned.flatMap(({ pattern, hint }) => {
  const match = readme.match(pattern);
  return match ? [{ line: match[0], hint }] : [];
});

if (failures.length > 0) {
  console.error("README drift check failed:\n");
  for (const { line, hint } of failures) {
    console.error(`  • Found "${line}" — ${hint}`);
  }
  console.error("\nUpdate README.md in the same PR as the code change. See AGENTS.md § README sync.");
  process.exit(1);
}

console.log("README drift check passed.");
