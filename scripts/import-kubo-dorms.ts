/**
 * Import Kubo's public accommodation directory as private dorm listings.
 *
 * Usage:
 *   bun run scripts/import-kubo-dorms.ts --dry-run
 *   bun run scripts/import-kubo-dorms.ts
 */
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { dormsTable, editorHistoryTable, updateTable } from "../drizzle/schema";
import {
  parseKuboDormImports,
  type KuboDormImport,
} from "../src/lib/kubo-dorm-import";
import { loadEnv } from "./load-env";

loadEnv();

const KUBO_DORMS_URL = "https://api.kubo.community/api/dorms";
const DRY_RUN = process.argv.includes("--dry-run");
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const response = await fetch(KUBO_DORMS_URL, {
  headers: { Accept: "application/json", "User-Agent": "room-tba" },
  signal: AbortSignal.timeout(10_000),
});
if (!response.ok)
  throw new Error(`Kubo directory returned HTTP ${response.status}`);

const listings = await response.json();
if (!Array.isArray(listings)) {
  throw new Error("Kubo directory returned invalid listing data");
}

const details: unknown[] = [];
for (const listing of listings) {
  const slug =
    typeof listing === "object" &&
    listing !== null &&
    typeof (listing as { slug?: unknown }).slug === "string"
      ? (listing as { slug: string }).slug
      : null;
  if (!slug)
    throw new Error("Kubo directory returned a listing without a slug");

  const detailResponse = await fetch(`${KUBO_DORMS_URL}/${slug}`, {
    headers: { Accept: "application/json", "User-Agent": "room-tba" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!detailResponse.ok) {
    throw new Error(
      `Kubo listing ${slug} returned HTTP ${detailResponse.status}`,
    );
  }
  details.push(await detailResponse.json());
}

const imports = parseKuboDormImports(details);
if (!imports) throw new Error("Kubo directory returned invalid dorm data");

const pool = new pg.Pool({ connectionString });
const db = drizzle(pool);

try {
  const existing = await db.select().from(dormsTable);
  const existingByName = new Map(
    existing.map((dorm) => [normalizeName(dorm.dormName), dorm]),
  );
  const additions = imports.filter(
    (dorm) => !existingByName.has(normalizeName(dorm.dormName)),
  );
  const updates = imports.filter((dorm) =>
    existingByName.has(normalizeName(dorm.dormName)),
  );

  console.log(
    `Kubo directory: ${imports.length} listings; ${additions.length} new; ${updates.length} refreshed.`,
  );
  for (const dorm of additions) console.log(`- ${dorm.dormName}`);
  if (!DRY_RUN) {
    await db.transaction(async (tx) => {
      for (const incoming of imports) {
        const current = existingByName.get(normalizeName(incoming.dormName));
        if (current) {
          const [updated] = await tx
            .update(dormsTable)
            .set({
              ...mergeKuboDetails(current, incoming),
              version: sql`"version" + 1`,
              updatedAt: sql`now()`,
            })
            .where(eq(dormsTable.id, current.id))
            .returning();
          if (!updated)
            throw new Error(`Could not refresh ${incoming.dormName}`);
          await tx.insert(editorHistoryTable).values({
            entityType: "dorm",
            entityId: current.id,
            action: "update",
            before: current,
            after: updated,
            versionBefore: current.version,
            versionAfter: updated.version,
            editedBy: "kubo-directory-import-2026-07",
            summary: "Refreshed from Kubo's public dorm listing.",
          });
        } else {
          const [inserted] = await tx
            .insert(dormsTable)
            .values(incoming)
            .returning();
          if (!inserted)
            throw new Error(`Could not create ${incoming.dormName}`);
          await tx.insert(editorHistoryTable).values({
            entityType: "dorm",
            entityId: inserted.id,
            action: "create",
            after: inserted,
            versionAfter: inserted.version,
            editedBy: "kubo-directory-import-2026-07",
            summary: "Imported from Kubo's public dorm directory.",
          });
        }
      }
      await tx
        .insert(updateTable)
        .values({ tableName: "dorms", syncKey: randomUUID() })
        .onConflictDoUpdate({
          target: updateTable.tableName,
          set: { syncKey: randomUUID() },
        });
    });

    console.log(
      `Imported ${additions.length} and refreshed ${updates.length} Kubo listings.`,
    );
  }
} finally {
  await pool.end();
}

function mergeKuboDetails(
  current: typeof dormsTable.$inferSelect,
  incoming: KuboDormImport,
): KuboDormImport {
  return {
    ...incoming,
    gender:
      incoming.gender === "unspecified" ? current.gender : incoming.gender,
    capacity: incoming.capacity ?? current.capacity,
    amenities: incoming.amenities ?? current.amenities,
    description: current.description ?? incoming.description,
    priceRange: incoming.priceRange ?? current.priceRange,
    contactPhone: incoming.contactPhone ?? current.contactPhone,
    facebookLink: incoming.facebookLink ?? current.facebookLink,
    imageUrl: incoming.imageUrl ?? current.imageUrl,
  };
}

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}
