/**
 * Reports which campus buildings actually have Street View imagery.
 *
 * Uses only the metadata endpoint, which is free and unmetered, so this can be
 * run repeatedly without a bill.
 *
 * Measured 2026-08-05: 52/52 buildings covered within 100m, much of it
 * captured 2026-02. Campus coverage turned out to be far better than assumed,
 * so the interesting output is the distance column, not the hit rate. A
 * building whose nearest panorama is unusually far away is worth a look: it
 * may be a pin in the wrong place rather than a gap in Google's coverage.
 *
 *   PUBLIC_GOOGLE_MAPS_API_KEY=... bun run scripts/street-view-coverage.ts
 *   ... --radius 150     widen the search (default 100m)
 *   ... --json           machine-readable output
 *   ... --write          cache the result on buildings.street_view_*
 *
 * With --write this doubles as the backfill. It caches the metadata only, not
 * the imagery, which Google's terms forbid storing. Re-running is safe: every
 * row is overwritten with a fresh answer and checked_at is stamped, which is
 * what distinguishes "no coverage" from "never looked".
 *
 * Scripts cannot import @lib/db (it reads astro:env/server, which only exists
 * inside Astro), so this opens its own connection, the same way
 * bulk-history.ts does.
 */
import pg from "pg";
import {
  fetchStreetViewMetadata,
  hasStreetViewKey,
} from "../src/lib/street-view.ts";
import { loadEnv } from "./load-env";

loadEnv();

const key = process.env.PUBLIC_GOOGLE_MAPS_API_KEY;
if (!hasStreetViewKey(key)) {
  console.error(
    "PUBLIC_GOOGLE_MAPS_API_KEY is missing. This script only reads the free\n" +
      "metadata endpoint, but it still needs a key to authenticate.",
  );
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is missing.");
  process.exit(1);
}

const args = process.argv.slice(2);
const asJson = args.includes("--json");
const write = args.includes("--write");
const radiusArg = args.indexOf("--radius");
const radius = radiusArg >= 0 ? Number(args[radiusArg + 1]) : 100;
if (!Number.isFinite(radius) || radius <= 0) {
  console.error("--radius must be a positive number of metres.");
  process.exit(1);
}

type Row = { id: number; name: string; lat: number | null; lng: number | null };

const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();

// Columns are building_name / lat / lon, not name / latitude / longitude.
// Both are NOT NULL in the schema, so no null filter is needed.
const { rows: buildings } = await client.query<Row>(
  `SELECT id, building_name AS name, lat, lon AS lng
     FROM buildings
    ORDER BY building_name`,
);

// Close before the fetch loop, not after. Holding the connection open across
// ~50 sequential HTTP round trips idles it out, and the script died on
// "Connection terminated unexpectedly" partway through the run. With --write
// a second connection is opened afterwards for the updates.
await client.end();

const covered: {
  id: number;
  name: string;
  panoId: string;
  date?: string;
  metres: number;
}[] = [];
const uncovered: { id: number; name: string }[] = [];
const errored: { id: number; name: string; reason: string }[] = [];

/** Rough metres between two campus points. Fine at this scale. */
function metresBetween(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const dLat = (b.lat - a.lat) * 111_320;
  const dLng = (b.lng - a.lng) * 111_320 * Math.cos((a.lat * Math.PI) / 180);
  return Math.round(Math.sqrt(dLat * dLat + dLng * dLng));
}

// Sequential on purpose. This is a one-off audit of a few hundred rows, and a
// burst of parallel requests is the fastest way to get a key rate limited.
for (const b of buildings) {
  if (b.lat === null || b.lng === null) continue;
  const coords = { lat: Number(b.lat), lng: Number(b.lng) };
  const meta = await fetchStreetViewMetadata(coords, key, { radius });
  if (meta.status === "OK") {
    covered.push({
      id: b.id,
      name: b.name,
      panoId: meta.panoId,
      date: meta.date,
      metres: metresBetween(coords, meta.location),
    });
  } else if (meta.status === "ERROR") {
    errored.push({ id: b.id, name: b.name, reason: meta.reason });
  } else {
    uncovered.push({ id: b.id, name: b.name });
  }
}

if (write) {
  // Metadata only. Google's terms forbid storing their imagery, so nothing
  // here touches an image; the panel renders the picture live.
  const writer = new pg.Client({ connectionString: databaseUrl });
  await writer.connect();
  const byId = new Map(covered.map((c) => [c.id, c]));
  let updated = 0;
  for (const b of buildings) {
    const hit = byId.get(b.id);
    // Errored rows are skipped rather than written as "no coverage": a
    // transport failure is not evidence that imagery is absent.
    if (!hit && errored.some((e) => e.id === b.id)) continue;
    await writer.query(
      `UPDATE buildings
          SET street_view_pano_id = $2,
              street_view_captured = $3,
              street_view_distance_m = $4,
              street_view_checked_at = NOW()
        WHERE id = $1`,
      [b.id, hit?.panoId ?? null, hit?.date ?? null, hit?.metres ?? null],
    );
    updated++;
  }
  await writer.end();
  console.log(`cached metadata for ${updated} buildings`);
}

if (asJson) {
  console.log(
    JSON.stringify(
      { radius, total: buildings.length, covered, uncovered, errored },
      null,
      2,
    ),
  );
} else {
  const pct = buildings.length
    ? Math.round((covered.length / buildings.length) * 100)
    : 0;
  console.log(`Street View coverage within ${radius}m`);
  console.log(
    `  ${covered.length}/${buildings.length} buildings covered (${pct}%)`,
  );
  console.log(`  ${uncovered.length} with no imagery`);
  if (errored.length) console.log(`  ${errored.length} errored`);

  if (covered.length) {
    console.log("\nCovered (distance to nearest panorama):");
    for (const c of covered.sort((a, b) => a.metres - b.metres)) {
      console.log(
        `  ${String(c.metres).padStart(4)}m  ${c.name}${c.date ? `  (${c.date})` : ""}`,
      );
    }
  }
  if (uncovered.length) {
    console.log("\nNo imagery:");
    for (const u of uncovered) console.log(`  ${u.name}`);
  }
  if (errored.length) {
    console.log("\nErrors:");
    for (const e of errored) console.log(`  ${e.name}: ${e.reason}`);
  }
}
