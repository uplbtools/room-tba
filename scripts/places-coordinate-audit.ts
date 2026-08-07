/**
 * Audits building coordinates against Google Places (#963).
 *
 * For each building, asks Places Text Search for the building by name (biased
 * to the campus) and reports how far Google's location sits from our stored
 * pin. Report only: Google is not authoritative for campus interiors, so a
 * human reviews the table and fixes pins through the editor flow, which lands
 * the change in editor_history. Nothing here writes anywhere.
 *
 *   bun run audit:places-coordinates
 *   ... --from-api https://www.uplb.tools   read /api/buildings instead of the DB
 *   ... --threshold 50                       flag distance in metres
 *   ... --limit 5                            first N buildings (smoke a paid run cheaply)
 *   ... --json                               machine-readable output
 *
 * Cost: one Text Search request per building (~58), Essentials field mask,
 * roughly $1-2 per full run. The Places API (New) must be enabled in the
 * Google Cloud project — billing alone is not enough, and Google reports a
 * disabled API with a misleading "enable Billing" message.
 *
 * Scripts cannot import @lib/db (it reads astro:env/server, which only exists
 * inside Astro), so the DB path opens its own connection, the same way
 * street-view-coverage.ts does.
 */
import pg from "pg";
import { campusMap } from "../src/campus.config";
import { distanceMeters } from "../src/lib/campus-route";
import {
  DEFAULT_FLAG_THRESHOLD_M,
  classify,
  placesQueryText,
  type Bucket,
  type PlacesHit,
} from "./lib/places-audit-core";
import { loadEnv } from "./load-env";

loadEnv();

// Server-side key preferred (IP-restricted, minted for scripts). The browser
// key sometimes works from curl contexts, but relying on it means the audit
// breaks the day its referrer restriction is enforced properly.
const serverKey = process.env.GOOGLE_MAPS_SERVER_API_KEY;
const browserKey = process.env.PUBLIC_GOOGLE_MAPS_API_KEY;
const key = serverKey || browserKey;
if (!key || key.trim().length <= 8) {
  console.error(
    "No Google key. Set GOOGLE_MAPS_SERVER_API_KEY (preferred: an\n" +
      "IP-restricted server key with Places API (New) enabled) or\n" +
      "PUBLIC_GOOGLE_MAPS_API_KEY.",
  );
  process.exit(1);
}
if (!serverKey) {
  console.error(
    "note: using PUBLIC_GOOGLE_MAPS_API_KEY; mint an IP-restricted\n" +
      "GOOGLE_MAPS_SERVER_API_KEY for reliable script runs.\n",
  );
}

const args = process.argv.slice(2);
const asJson = args.includes("--json");
const fromApiArg = args.indexOf("--from-api");
const apiBase =
  fromApiArg >= 0 ? args[fromApiArg + 1]?.replace(/\/$/, "") : undefined;
const thresholdArg = args.indexOf("--threshold");
const threshold =
  thresholdArg >= 0 ? Number(args[thresholdArg + 1]) : DEFAULT_FLAG_THRESHOLD_M;
if (!Number.isFinite(threshold) || threshold <= 0) {
  console.error("--threshold must be a positive number of metres.");
  process.exit(1);
}
const limitArg = args.indexOf("--limit");
const limit =
  limitArg >= 0 ? Number(args[limitArg + 1]) : Number.MAX_SAFE_INTEGER;
if (!Number.isFinite(limit) || limit <= 0) {
  console.error("--limit must be a positive number.");
  process.exit(1);
}

type Row = { id: number; name: string; lat: number; lon: number };

async function readBuildings(): Promise<Row[]> {
  if (apiBase) {
    const res = await fetch(`${apiBase}/api/buildings`);
    if (!res.ok) {
      console.error(`buildings API ${res.status} from ${apiBase}`);
      process.exit(1);
    }
    const data = (await res.json()) as {
      id: number;
      buildingName: string;
      lat: number;
      lon: number;
    }[];
    return data
      .map((b) => ({ id: b.id, name: b.buildingName, lat: b.lat, lon: b.lon }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is missing (or pass --from-api <base-url>).");
    process.exit(1);
  }
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  // Columns are building_name / lat / lon, NOT NULL in the schema.
  const { rows } = await client.query<Row>(
    `SELECT id, building_name AS name, lat, lon
       FROM buildings
      ORDER BY building_name`,
  );
  // Close before the fetch loop, not after. Holding the connection open
  // across ~58 sequential HTTP round trips idles it out (see
  // street-view-coverage.ts, which died that way).
  await client.end();
  return rows;
}

const buildings = (await readBuildings()).slice(0, limit);

// Config stores [lng, lat]; Places wants latitude/longitude fields.
const [campusLng, campusLat] = campusMap.defaultCamera.center;

async function searchPlaces(name: string): Promise<PlacesHit | null> {
  const res = await fetch(
    "https://places.googleapis.com/v1/places:searchText",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "X-Goog-Api-Key": key as string,
        // Essentials-tier fields only; anything more moves the run up an SKU.
        "X-Goog-FieldMask": "places.displayName,places.location",
      },
      body: JSON.stringify({
        textQuery: placesQueryText(name),
        locationBias: {
          circle: {
            center: { latitude: campusLat, longitude: campusLng },
            radius: 2000,
          },
        },
        maxResultCount: 1,
      }),
    },
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Places ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    places?: {
      displayName?: { text?: string };
      location?: { latitude?: number; longitude?: number };
    }[];
  };
  const top = data.places?.[0];
  if (!top?.location?.latitude || !top.location.longitude) return null;
  return {
    name: top.displayName?.text ?? "",
    lat: top.location.latitude,
    lon: top.location.longitude,
  };
}

type Result = Row & {
  bucket: Bucket;
  placesName?: string;
  placesLat?: number;
  placesLon?: number;
  metres?: number;
};

const results: Result[] = [];
const errored: { name: string; reason: string }[] = [];

// Sequential on purpose: a burst of parallel requests is the fastest way to
// get a key rate limited, and this is ~58 rows once a quarter.
for (const b of buildings) {
  try {
    const hit = await searchPlaces(b.name);
    const metres = hit ? Math.round(distanceMeters(b, hit)) : null;
    results.push({
      ...b,
      bucket: classify(hit, b.name, metres, threshold),
      ...(hit
        ? {
            placesName: hit.name,
            placesLat: hit.lat,
            placesLon: hit.lon,
            metres: metres ?? undefined,
          }
        : {}),
    });
  } catch (error) {
    errored.push({
      name: b.name,
      reason: error instanceof Error ? error.message : String(error),
    });
  }
}

const flagged = results
  .filter((r) => r.bucket === "flagged")
  .sort((a, b) => (b.metres ?? 0) - (a.metres ?? 0));
const aligned = results
  .filter((r) => r.bucket === "aligned")
  .sort((a, b) => (b.metres ?? 0) - (a.metres ?? 0));
const unmatched = results.filter((r) => r.bucket === "unmatched");

if (asJson) {
  console.log(
    JSON.stringify(
      {
        threshold,
        total: buildings.length,
        flagged,
        aligned,
        unmatched,
        errored,
      },
      null,
      2,
    ),
  );
} else {
  // Markdown to stdout, like audit-campus-data.ts: the report is meant to be
  // pasted into a GitHub issue for human review.
  const out: string[] = [];
  const say = (line = "") => out.push(line);

  say("# Places coordinate audit");
  say();
  say(`Threshold: ${threshold}m. Report only; fix pins via the editor flow.`);
  say();
  say("| Bucket | Count |");
  say("| --- | --- |");
  say(`| Flagged (>= ${threshold}m) | ${flagged.length} |`);
  say(`| Aligned | ${aligned.length} |`);
  say(`| Unmatched / low confidence | ${unmatched.length} |`);
  say(`| Errored | ${errored.length} |`);
  say(`| Total audited | ${buildings.length} |`);

  if (flagged.length) {
    say();
    say("## Flagged: Places disagrees with the stored pin");
    say();
    say("| m | Building | Stored | Places says | Google's name |");
    say("| --- | --- | --- | --- | --- |");
    for (const r of flagged) {
      say(
        `| ${r.metres} | ${r.name} (#${r.id}) | ${r.lat.toFixed(5)}, ${r.lon.toFixed(5)} | ${r.placesLat?.toFixed(5)}, ${r.placesLon?.toFixed(5)} | ${r.placesName} |`,
      );
    }
  }

  if (unmatched.length) {
    say();
    say("## Unmatched (no result, or Google returned a different-named place)");
    say();
    for (const r of unmatched) {
      say(
        `- ${r.name} (#${r.id})${r.placesName ? ` — Google returned "${r.placesName}"${r.metres != null ? ` at ${r.metres}m` : ""}` : ""}`,
      );
    }
  }

  if (errored.length) {
    say();
    say("## Errors");
    say();
    for (const e of errored) say(`- ${e.name}: ${e.reason}`);
  }

  if (aligned.length) {
    say();
    say(`## Aligned (nearest first is furthest still under ${threshold}m)`);
    say();
    for (const r of aligned) {
      say(`- ${String(r.metres).padStart(3)}m ${r.name}`);
    }
  }

  console.log(out.join("\n"));
}
