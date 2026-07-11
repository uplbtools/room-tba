/**
 * Add missing UPLB offices and units from the public campus website directory.
 *
 * Usage:
 *   DATABASE_URL=... bun run scripts/import-campus-office-directory.ts [--dry-run]
 */

import { config } from "dotenv";
import { eq, sql } from "drizzle-orm";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import {
  buildingsTable,
  collegesTable,
  dormsTable,
  organizationsTable,
  updateTable,
} from "@drizzle/schema";
import { normalizeAlias } from "@lib/site";
import {
  campusOfficeDirectoryEntries,
  type CampusWebsite,
} from "@lib/campus-office-directory";

const CAMPUS_WEBSITES_API =
  "https://iaepijmnqstgxtivmlsh.supabase.co/rest/v1/websites?select=name,url,description,category&order=name";
const CAMPUS_DIRECTORY_PUBLIC_KEY =
  "sb_publishable_JL-xKlm48a57Lkoi7JK1MQ_6lBlLxGL";

config({ path: ".env" });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const response = await fetch(CAMPUS_WEBSITES_API, {
  headers: { apikey: CAMPUS_DIRECTORY_PUBLIC_KEY },
});
if (!response.ok) {
  throw new Error(
    `Campus directory request failed: ${response.status} ${response.statusText}`,
  );
}

const sources = (await response.json()) as CampusWebsite[];
if (sources.length < 150) {
  throw new Error(
    `Campus directory returned only ${sources.length} website records`,
  );
}

const entries = campusOfficeDirectoryEntries(sources);
const nameKeys = (name: string) => {
  const keys = [normalizeAlias(name)];
  const bare = name.replace(/\s*\([^)]*\)\s*$/, "");
  if (bare !== name) keys.push(normalizeAlias(bare));
  return keys.filter(Boolean);
};

const pool = new pg.Pool({ connectionString });
const db = drizzle(pool);

try {
  const [organizations, buildings, colleges, dorms] = await Promise.all([
    db
      .select({
        id: organizationsTable.id,
        name: organizationsTable.name,
        websiteLink: organizationsTable.websiteLink,
        facebookLink: organizationsTable.facebookLink,
      })
      .from(organizationsTable),
    db.select({ name: buildingsTable.buildingName }).from(buildingsTable),
    db.select({ name: collegesTable.collegeName }).from(collegesTable),
    db.select({ name: dormsTable.dormName }).from(dormsTable),
  ]);
  const existingByKey = new Map<string, (typeof organizations)[number]>();
  for (const organization of organizations) {
    for (const key of nameKeys(organization.name)) {
      existingByKey.set(key, organization);
    }
  }
  const occupied = new Set(
    [...buildings, ...colleges, ...dorms].flatMap((row) => nameKeys(row.name)),
  );
  const additions = [] as (typeof entries)[number][];
  const linkUpdates = [] as Array<{
    id: number;
    linkType: "facebook" | "website";
    url: string;
  }>;
  let covered = 0;

  for (const entry of entries) {
    const keys = nameKeys(entry.name);
    const existing = keys.map((key) => existingByKey.get(key)).find(Boolean);
    if (existing) {
      const needsLink =
        entry.linkType === "facebook"
          ? !existing.facebookLink
          : !existing.websiteLink;
      if (needsLink) {
        linkUpdates.push({
          id: existing.id,
          linkType: entry.linkType,
          url: entry.url,
        });
      }
      continue;
    }
    if (keys.some((key) => occupied.has(key))) {
      covered++;
      continue;
    }
    additions.push(entry);
  }

  if (process.argv.includes("--dry-run")) {
    console.log(
      `Campus offices: ${sources.length} links, ${entries.length} eligible units, ${additions.length} to add, ${linkUpdates.length} links to enrich, ${covered} covered elsewhere.`,
    );
  } else {
    await db.transaction(async (tx) => {
      if (additions.length) {
        await tx.insert(organizationsTable).values(
          additions.map((entry) => ({
            name: entry.name,
            category: entry.category,
            description: entry.description,
            ...(entry.linkType === "facebook"
              ? { facebookLink: entry.url }
              : { websiteLink: entry.url }),
          })),
        );
      }
      for (const update of linkUpdates) {
        await tx
          .update(organizationsTable)
          .set(
            update.linkType === "facebook"
              ? { facebookLink: update.url }
              : { websiteLink: update.url },
          )
          .where(eq(organizationsTable.id, update.id));
      }
      if (additions.length || linkUpdates.length) {
        await tx
          .insert(updateTable)
          .values({ tableName: "organizations" })
          .onConflictDoUpdate({
            target: updateTable.tableName,
            set: { syncKey: sql`gen_random_uuid()` },
          });
      }
    });
    console.log(
      `Added ${additions.length} campus units and enriched ${linkUpdates.length} existing links.`,
    );
  }
} finally {
  await pool.end();
}
