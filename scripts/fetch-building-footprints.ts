/**
 * Builds src/constants/building-footprints.json: the OpenStreetMap footprint
 * the 3D viewer draws for each building, so it never waits on Overpass for a
 * building this script has seen.
 *
 *   bun run scripts/fetch-building-footprints.ts
 *   ... --from-api https://<deployment>.vercel.app   buildings source (default prod)
 *   ... --missing-only                               only query buildings with no entry yet
 *
 * Same selection as the viewer's live fallback (selectFootprint in
 * src/lib/overpass.ts). Queries run one at a time with a pause between them,
 * as the Overpass usage policy asks. A building whose query fails keeps its
 * previous entry; one where OSM has nothing is stored as null.
 *
 * Data © OpenStreetMap contributors, ODbL
 * (https://www.openstreetmap.org/copyright), credited in the viewer.
 */
import { readFileSync, writeFileSync } from "node:fs";
import type { BuildingFootprintsManifest } from "../src/lib/building-footprints";
import {
  fetchOverpass,
  footprintQuery,
  selectFootprint,
  type LngLat,
  type OverpassElement,
} from "../src/lib/overpass";

const OUT_PATH = "src/constants/building-footprints.json";
const DEFAULT_API = "https://room-tba.uplb.tools";
const USER_AGENT =
  "RoomTBA-building-footprints/1.0 (https://github.com/uplbtools/room-tba)";
const DELAY_MS = 1500;

type Building = {
  buildingName: string;
  lat: number | null;
  lon: number | null;
};

const at = process.argv.indexOf("--from-api");
const apiBase = (at === -1 ? DEFAULT_API : process.argv[at + 1]!).replace(
  /\/$/,
  "",
);

const res = await fetch(`${apiBase}/api/buildings`, {
  headers: { "user-agent": USER_AGENT },
});
if (!res.ok) throw new Error(`buildings API ${res.status} from ${apiBase}`);
const buildings = (await res.json()) as Building[];

// Read directly instead of checking existsSync first, so there is no window
// between the check and the read (CodeQL js/file-system-race).
function readPrevious(): BuildingFootprintsManifest {
  try {
    return JSON.parse(readFileSync(OUT_PATH, "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw error;
  }
}
const previous = readPrevious();
const manifest: BuildingFootprintsManifest = {};
const round = ([lng, lat]: LngLat): LngLat => [
  Number(lng.toFixed(7)),
  Number(lat.toFixed(7)),
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
// --missing-only keeps existing entries and queries only buildings the
// manifest lacks, e.g. to finish a run that hit a bad Overpass hour.
const missingOnly = process.argv.includes("--missing-only");
let pending = buildings.filter((b) => {
  if (b.lat == null || b.lon == null) return false;
  if (missingOnly && b.buildingName in previous) {
    manifest[b.buildingName] = previous[b.buildingName]!;
    return false;
  }
  return true;
});
// Public Overpass servers shed load in bursts; one slower second pass over
// the failures recovers most of them.
for (const [pass, delay] of [
  [1, DELAY_MS],
  [2, DELAY_MS * 4],
] as const) {
  const retry: Building[] = [];
  if (pass === 2 && pending.length > 0) await sleep(30_000);
  for (const building of pending) {
    const { buildingName } = building;
    const lat = Number(building.lat);
    const lon = Number(building.lon);
    const data = (await fetchOverpass(footprintQuery(lat, lon), {
      headers: { "user-agent": USER_AGENT },
      timeoutMs: 30_000,
    })) as { elements?: OverpassElement[] } | null;
    await sleep(delay);

    if (data === null) {
      retry.push(building);
      console.warn(`${buildingName}: Overpass failed (pass ${pass})`);
      continue;
    }
    const footprint = selectFootprint(data, lat, lon);
    manifest[buildingName] = footprint && {
      ...footprint,
      outline: footprint.outline.map(round),
    };
    console.log(
      `${buildingName}: ${
        footprint
          ? `${footprint.outline.length} pts${footprint.containsPoint ? "" : " (nearest, not containing)"}`
          : "no OSM building, approximate box"
      }`,
    );
  }
  pending = retry;
}

// Still failing after both passes: keep the previous entry, if any, so a bad
// Overpass day never deletes footprints. Missing keys fall back to live
// Overpass in the viewer.
for (const { buildingName } of pending) {
  if (buildingName in previous)
    manifest[buildingName] = previous[buildingName]!;
}

// One building per line in stable order keeps re-runs reviewable as diffs
// (biome skips this file, as it does jeepney-geometries.json).
const lines = Object.entries(manifest)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(
    ([name, entry]) => `  ${JSON.stringify(name)}: ${JSON.stringify(entry)}`,
  );
writeFileSync(OUT_PATH, `{\n${lines.join(",\n")}\n}\n`);
const entries = Object.values(manifest);
const real = entries.filter(Boolean).length;
const nearest = entries.filter((e) => e && !e.containsPoint).length;
console.log(
  `\nWrote ${OUT_PATH}: ${real} OSM footprints (${nearest} nearest-not-containing), ` +
    `${entries.length - real} approximate, ${pending.length} not in manifest (Overpass failed), ` +
    `of ${buildings.length} buildings`,
);
