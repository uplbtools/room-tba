/**
 * Seed UPLB organizations/offices/spots from data/uplb-directory.json into the
 * `organizations` and `places` tables. Entries were researched from
 * public university directories and OpenStreetMap (source URL per row).
 *
 * Idempotent: rows whose normalized name already exists in the target table
 * (or as a dorm/college/building for org-like entries) are skipped.
 *
 * Usage:
 *   DATABASE_URL=... bun run scripts/seed-uplb-directory.ts [--dry-run]
 */

import { config } from "dotenv";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import {
  buildingsTable,
  collegesTable,
  dormsTable,
  organizationsTable,
  placesTable,
} from "@drizzle/schema";
import { normalizeAlias } from "../src/lib/site";
import entries from "../data/uplb-directory.json";

config({ path: ".env" });

const dryRun = process.argv.includes("--dry-run");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString });
const db = drizzle(pool);

type Entry = {
  name: string;
  type: string;
  building_or_area: string;
  description: string;
  lat: number | null;
  lng: number | null;
  source: string;
};

const ORG_TYPES = new Set([
  "office",
  "unit",
  "academic",
  "student-org",
  "college-org",
]);
const PLACE_TYPES = new Set(["food", "tourist-spot", "landmark", "transport"]);

/** Official pages are real websites; OSM element URLs are provenance only. */
function websiteLink(source: string): string | null {
  try {
    const host = new URL(source).hostname;
    const provenanceOnly = ["openstreetmap.org", "facebook.com"].some(
      (domain) => host === domain || host.endsWith(`.${domain}`),
    );
    return provenanceOnly ? null : source;
  } catch {
    return null;
  }
}

const [orgs, places, dorms, colleges, buildings] = await Promise.all([
  db.select({ name: organizationsTable.name }).from(organizationsTable),
  db.select({ name: placesTable.name }).from(placesTable),
  db.select({ name: dormsTable.dormName }).from(dormsTable),
  db.select({ name: collegesTable.collegeName }).from(collegesTable),
  db.select({ name: buildingsTable.buildingName }).from(buildingsTable),
]);

const norm = (rows: { name: string }[]) =>
  new Set(rows.map((r) => normalizeAlias(r.name)).filter(Boolean));
const orgNames = norm(orgs);
const placeNames = norm(places);
// Colleges, dorms, and buildings already have their own pins — an org/place
// row with the same name would double-pin the map.
const otherEntityNames = new Set([
  ...norm(dorms),
  ...norm(colleges),
  ...norm(buildings),
]);

/** "College of Arts and Sciences (CAS)" also matches without the acronym. */
function nameKeys(name: string): string[] {
  const keys = [normalizeAlias(name)];
  const bare = name.replace(/\s*\([^)]*\)\s*$/, "");
  if (bare !== name) keys.push(normalizeAlias(bare));
  return keys.filter(Boolean);
}

let inserted = 0;
let skipped = 0;

for (const entry of entries as Entry[]) {
  const keys = nameKeys(entry.name);
  // Residence halls live in the dorms table; UPOU is not a UPLB campus POI.
  const isDormRow = /residence hall/i.test(entry.name);
  const isOrg =
    ORG_TYPES.has(entry.type) ||
    (entry.type === "service" &&
      !isDormRow &&
      !/church|chapel/i.test(entry.name));
  const isPlace =
    PLACE_TYPES.has(entry.type) ||
    (entry.type === "service" && /church|chapel/i.test(entry.name));

  if (isDormRow || (!isOrg && !isPlace)) {
    skipped++;
    continue;
  }

  const target = isOrg ? "organizations" : "places";
  const existing = isOrg ? orgNames : placeNames;
  const collides =
    keys.some((k) => existing.has(k)) ||
    keys.some((k) => otherEntityNames.has(k));
  if (collides) {
    skipped++;
    continue;
  }

  const description = `${entry.description} Located at: ${entry.building_or_area}.`;
  const category = isOrg
    ? ORG_TYPES.has(entry.type)
      ? entry.type
      : "service"
    : PLACE_TYPES.has(entry.type)
      ? entry.type
      : "service";

  if (dryRun) {
    console.log(`[dry-run] ${target}: ${entry.name} (${category})`);
  } else if (isOrg) {
    await db.insert(organizationsTable).values({
      name: entry.name,
      category,
      lat: entry.lat,
      lon: entry.lng,
      description,
      websiteLink: websiteLink(entry.source),
    });
  } else {
    await db.insert(placesTable).values({
      name: entry.name,
      category,
      lat: entry.lat,
      lon: entry.lng,
      description,
      websiteLink: websiteLink(entry.source),
    });
  }
  for (const k of keys) existing.add(k);
  inserted++;
}

console.log(
  `${dryRun ? "[dry-run] would insert" : "Inserted"} ${inserted}, skipped ${skipped} (already present / covered by dorms, colleges, or buildings).`,
);
await pool.end();
