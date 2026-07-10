/**
 * Import the current public OSA organization directory into Room TBA.
 *
 * Usage:
 *   DATABASE_URL=... bun run scripts/import-osa-organizations.ts [--dry-run]
 */

import { config } from "dotenv";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { organizationsTable, updateTable } from "@drizzle/schema";
import { sql } from "drizzle-orm";
import { UPLB_OSA_ORGANIZATIONS_URL } from "@constants/community-links";
import { parseOsaOrganizations } from "@lib/osa-organization-directory";
import { normalizeAlias } from "@lib/site";

config({ path: ".env" });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const response = await fetch(UPLB_OSA_ORGANIZATIONS_URL);
if (!response.ok) {
  throw new Error(
    `OSA directory request failed: ${response.status} ${response.statusText}`,
  );
}

const sourceOrganizations = parseOsaOrganizations(await response.text());
if (sourceOrganizations.length < 150) {
  throw new Error(
    `OSA directory parse returned only ${sourceOrganizations.length} organizations`,
  );
}

const sourceNames = new Set<string>();
for (const organization of sourceOrganizations) {
  const normalized = normalizeAlias(organization.name);
  if (sourceNames.has(normalized)) {
    throw new Error(
      `OSA directory has duplicate organization name: ${organization.name}`,
    );
  }
  sourceNames.add(normalized);
}

const pool = new pg.Pool({ connectionString });
const db = drizzle(pool);

try {
  const existing = await db
    .select({ name: organizationsTable.name })
    .from(organizationsTable);
  const existingNames = new Set(
    existing.map((organization) => normalizeAlias(organization.name)),
  );
  const additions = sourceOrganizations.filter(
    (organization) => !existingNames.has(normalizeAlias(organization.name)),
  );

  if (process.argv.includes("--dry-run")) {
    console.log(
      `OSA directory: ${sourceOrganizations.length} listed, ${additions.length} to add.`,
    );
  } else {
    if (additions.length) {
      await db.transaction(async (tx) => {
        await tx.insert(organizationsTable).values(
          additions.map((organization) => ({
            name: organization.name,
            category: "student-org",
            description:
              "Listed by the UPLB Office of Student Activities for Second Semester, AY 2025–2026.",
            websiteLink: organization.officialUrl,
          })),
        );
        await tx
          .insert(updateTable)
          .values({ tableName: "organizations" })
          .onConflictDoUpdate({
            target: updateTable.tableName,
            set: { syncKey: sql`gen_random_uuid()` },
          });
      });
    }
    console.log(`Added ${additions.length} OSA organization listings.`);
  }
} finally {
  await pool.end();
}
