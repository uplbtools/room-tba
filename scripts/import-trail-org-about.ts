/**
 * Enrich Room TBA organizations with "About the org" data (biography, OSA type,
 * year established, roster size) sourced from the community UPLB Trail directory
 * (https://uplb-trail.vercel.app), which itself mirrors the UPLB OSA org list.
 *
 * Matches Trail rows to existing Room TBA organizations by normalized name
 * (acronyms in parentheses are matched too). Only fills the new about fields;
 * never creates rows and never overwrites a non-empty existing description.
 *
 * Usage:
 *   DATABASE_URL=... bun run scripts/import-trail-org-about.ts [--dry-run]
 */

import { config } from "dotenv";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, sql } from "drizzle-orm";
import { organizationsTable, updateTable } from "@drizzle/schema";
import { normalizeAlias } from "@lib/site";

config({ path: ".env" });

const TRAIL_REST =
  "https://iaepijmnqstgxtivmlsh.supabase.co/rest/v1/organizations?select=*&order=id&limit=1000";
// Public (publishable) anon key - read-only RLS, safe to embed for a public dir.
const TRAIL_KEY = "sb_publishable_JL-xKlm48a57Lkoi7JK1MQ_6lBlLxGL";

type TrailOrg = {
  organization_name: string;
  profile_url: string | null;
  type: string | null;
  year_established: string | null;
  roster_size: string | null;
  facebook_page: string | null;
  bio_summary: string | null;
};

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const STOP_WORDS = new Set([
  "up",
  "uplb",
  "the",
  "of",
  "and",
  "ng",
  "sa",
  "mga",
  "society",
  "organization",
  "org",
  "club",
  "association",
  "alliance",
]);

/** Significant lowercase words in a name, minus the parenthetical + stop words. */
function significantTokens(name: string): Set<string> {
  return new Set(
    name
      .replace(/\([^)]*\)/g, " ")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 1 && !STOP_WORDS.has(t)),
  );
}

/** Strong keys (full name, name-without-paren) that match on their own. */
function strongKeys(name: string): string[] {
  const keys = [normalizeAlias(name)];
  const withoutParen = name.replace(/\([^)]*\)/g, "").trim();
  if (withoutParen && withoutParen !== name)
    keys.push(normalizeAlias(withoutParen));
  return keys.filter(Boolean);
}

/** Parenthetical acronym key - only trusted with a corroborating word overlap. */
function acronymKey(name: string): string | null {
  const acronym = name.match(/\(([^)]+)\)/)?.[1];
  return acronym ? normalizeAlias(acronym) || null : null;
}

const response = await fetch(TRAIL_REST, { headers: { apikey: TRAIL_KEY } });
if (!response.ok) {
  throw new Error(
    `UPLB Trail request failed: ${response.status} ${response.statusText}`,
  );
}
const trailOrgs = (await response.json()) as TrailOrg[];
if (trailOrgs.length < 100) {
  throw new Error(`Trail returned only ${trailOrgs.length} organizations`);
}

// Strong lookup (full name), plus a separate acronym lookup used only with a
// corroborating word overlap so short acronyms (OSA, UP AG) can't mis-match.
const trailByStrongKey = new Map<string, TrailOrg>();
const trailByAcronym = new Map<string, TrailOrg>();
for (const org of trailOrgs) {
  for (const key of strongKeys(org.organization_name)) {
    if (!trailByStrongKey.has(key)) trailByStrongKey.set(key, org);
  }
  const acronym = acronymKey(org.organization_name);
  if (acronym && !trailByAcronym.has(acronym)) trailByAcronym.set(acronym, org);
}

function findTrailMatch(name: string): TrailOrg | undefined {
  for (const key of strongKeys(name)) {
    const hit = trailByStrongKey.get(key);
    if (hit) return hit;
  }
  const acronym = acronymKey(name);
  if (!acronym) return undefined;
  const candidate = trailByAcronym.get(acronym);
  if (!candidate) return undefined;
  // Require at least one shared significant word between the two full names.
  const tokens = significantTokens(name);
  for (const token of significantTokens(candidate.organization_name)) {
    if (tokens.has(token)) return candidate;
  }
  return undefined;
}

const pool = new pg.Pool({ connectionString });
const db = drizzle(pool);

try {
  const existing = await db
    .select({
      id: organizationsTable.id,
      name: organizationsTable.name,
      description: organizationsTable.description,
      facebookLink: organizationsTable.facebookLink,
      bio: organizationsTable.bio,
    })
    .from(organizationsTable);

  const updates: {
    id: number;
    name: string;
    bio: string | null;
    orgType: string | null;
    establishedYear: string | null;
    memberCount: string | null;
    facebookLink: string | null;
  }[] = [];

  for (const org of existing) {
    const trail = findTrailMatch(org.name);
    if (!trail) continue;

    updates.push({
      id: org.id,
      name: org.name,
      bio: trail.bio_summary?.trim() || org.bio,
      orgType: trail.type?.trim() || null,
      establishedYear: trail.year_established?.trim() || null,
      memberCount: trail.roster_size?.trim() || null,
      // Only fill Facebook if we don't already have one.
      facebookLink: org.facebookLink || trail.facebook_page?.trim() || null,
    });
  }

  console.log(
    `Trail: ${trailOrgs.length} listed, matched ${updates.length}/${existing.length} Room TBA orgs.`,
  );

  if (process.argv.includes("--dry-run")) {
    for (const u of updates.slice(0, 10)) {
      console.log(`  ${u.name} → ${u.orgType}, est ${u.establishedYear}`);
    }
  } else if (updates.length) {
    await db.transaction(async (tx) => {
      for (const u of updates) {
        await tx
          .update(organizationsTable)
          .set({
            bio: u.bio,
            orgType: u.orgType,
            establishedYear: u.establishedYear,
            memberCount: u.memberCount,
            facebookLink: u.facebookLink,
          })
          .where(eq(organizationsTable.id, u.id));
      }
      await tx
        .insert(updateTable)
        .values({ tableName: "organizations" })
        .onConflictDoUpdate({
          target: updateTable.tableName,
          set: { syncKey: sql`gen_random_uuid()` },
        });
    });
    console.log(`Enriched ${updates.length} organizations with about data.`);
  }
} finally {
  await pool.end();
}
