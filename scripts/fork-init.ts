/**
 * Bootstrap a fork: rewrite src/campus.config.ts for your campus.
 *
 * Prompts for the campus-specific surface (name, URL, map center/bounds/zoom,
 * terrain, transit) and regenerates the config file from the shared template
 * in src/lib/fork/campus-config-template.ts (the /fork wizard renders the same
 * one) so it stays typechecked. Everything else a fork replaces (seed data,
 * transit routes, importers) is listed by `bun run fork:check`.
 *
 * Usage:
 *   bun run fork:init             # interactive
 *   bun run fork:init --defaults  # accept every fallback (smoke test / CI)
 *   bun run fork:init --force     # allow a dirty git tree
 *
 * Idempotent: re-running with the same answers writes the same file. A dirty
 * tree is refused (except campus.config.ts itself) so the rewrite stays easy
 * to review and revert.
 */
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import readline from "node:readline/promises";
import { generateCampusConfig } from "@lib/fork/campus-config-template";

const CONFIG_PATH = "src/campus.config.ts";
const force = process.argv.includes("--force");
const useDefaults = process.argv.includes("--defaults");

const dirty = execSync("git status --porcelain", { encoding: "utf8" })
  .trim()
  .split("\n")
  .filter((line) => line && !line.endsWith(CONFIG_PATH));
if (dirty.length > 0 && !force) {
  console.error(
    "Refusing to run on a dirty git tree so the config rewrite is easy to review. Commit or stash first, or pass --force.",
  );
  process.exit(1);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function ask(question: string, fallback: string): Promise<string> {
  if (useDefaults) return fallback;
  const answer = (await rl.question(`${question} [${fallback}]: `)).trim();
  return answer || fallback;
}

async function askNumber(question: string, fallback: number): Promise<number> {
  const raw = await ask(question, String(fallback));
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    console.error(`  "${raw}" is not a number; using ${fallback}.`);
    return fallback;
  }
  return value;
}

async function askBool(question: string, fallback: boolean): Promise<boolean> {
  const raw = await ask(`${question} (y/n)`, fallback ? "y" : "n");
  return /^y/i.test(raw);
}

const name = await ask("Campus app name", "Room TBA");
const url = await ask("Site URL", "https://rooms.example.edu");
const lat = await askNumber("Map center latitude", 14.163237);
const lng = await askNumber("Map center longitude", 121.241259);
const west = await askNumber("Bounds west longitude", lng - 0.08);
const south = await askNumber("Bounds south latitude", lat - 0.06);
const east = await askNumber("Bounds east longitude", lng + 0.08);
const north = await askNumber("Bounds north latitude", lat + 0.06);
const zoom = await askNumber("Default zoom", 15.8);
const terrainOn = await askBool("Enable 3D terrain (needs MapTiler)", false);
const transitOn = await askBool("Enable campus transit overlay", false);
rl.close();

const config = generateCampusConfig({
  name,
  siteUrl: url,
  center: [lng, lat],
  bounds: [
    [west, south],
    [east, north],
  ],
  defaultZoom: zoom,
  transitOverlay: transitOn,
  transitLabel: "Campus transit",
  terrain: terrainOn,
});

writeFileSync(CONFIG_PATH, config);
try {
  // Prompted values change line lengths; let the repo formatter settle them.
  execSync(`bunx biome format --write ${CONFIG_PATH}`, { stdio: "ignore" });
} catch {
  console.warn("biome format failed — run `bun run lint:fix` yourself.");
}
console.log(`Wrote ${CONFIG_PATH}.`);
console.log(
  "Next: bun run fork:check (remaining upstream strings), replace seed data, and see README § Fork this for your campus.",
);
