/**
 * Seed building search aliases from public/room_info.json into the `aliases`
 * table (#155). Each building's canonical name + its listed aliases are stored
 * as `source: room_info_json`, `confidence: unverified`, pointing at the
 * matched building row.
 *
 * Usage:
 *   NEON_CONNECTION_STRING=... ./node_modules/.bin/bun run scripts/seed-aliases.ts
 */

import { config } from "dotenv";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { aliasesTable, buildingsTable } from "../drizzle/schema";
import { normalizeAlias } from "../src/lib/site";
import roomInfo from "../public/room_info.json";

config({ path: ".env" });

const connectionString = process.env.NEON_CONNECTION_STRING;
if (!connectionString) {
  console.error("NEON_CONNECTION_STRING is required");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString });
const db = drizzle(pool);

const buildings = await db
  .select({ id: buildingsTable.id, name: buildingsTable.buildingName })
  .from(buildingsTable);

const byNorm = new Map<string, number>();
for (const b of buildings) byNorm.set(normalizeAlias(b.name), b.id);

/** Best-effort building match: exact normalized name, then prefix overlap. */
function findBuildingId(candidates: string[]): number | undefined {
  const norm = candidates.map(normalizeAlias).filter(Boolean);
  for (const nc of norm) {
    const exact = byNorm.get(nc);
    if (exact !== undefined) return exact;
  }
  for (const nc of norm) {
    if (nc.length < 4) continue;
    for (const [dbNorm, id] of byNorm) {
      if (dbNorm.startsWith(nc) || nc.startsWith(dbNorm)) return id;
    }
  }
  return undefined;
}

const buildingEntries: Record<string, { aliases?: string[] }> =
  (roomInfo as { buildings?: Record<string, { aliases?: string[] }> })
    .buildings ?? {};

let inserted = 0;
let unmatched = 0;

for (const [buildingName, info] of Object.entries(buildingEntries)) {
  const aliases = Array.isArray(info.aliases) ? info.aliases : [];
  const candidates = [buildingName, ...aliases];
  const targetId = findBuildingId(candidates);
  if (targetId === undefined) {
    unmatched++;
    console.warn(`No building match for "${buildingName}"`);
    continue;
  }
  for (const alias of candidates) {
    const normalizedAlias = normalizeAlias(alias);
    if (!normalizedAlias) continue;
    const result = await db
      .insert(aliasesTable)
      .values({
        alias,
        normalizedAlias,
        targetType: "building",
        targetId,
        source: "room_info_json",
        confidence: "unverified",
      })
      .onConflictDoNothing();
    inserted += result.rowCount ?? 0;
  }
}

await pool.end();
console.log(
  `Alias seed complete: inserted ${inserted} aliases, ${unmatched} unmatched buildings.`,
);
