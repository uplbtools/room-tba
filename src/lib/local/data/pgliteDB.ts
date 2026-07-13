import { PGlite } from "@electric-sql/pglite";
import { PGLITE_INIT_SQL } from "./pglite-schema.generated";

let localDB: PGlite | null = null;

/**
 * Create/upgrade the offline cache tables. The DDL is generated from
 * drizzle/schema.ts (see scripts/generate-pglite-schema.ts), so the server
 * schema is the single source of truth; ADD COLUMN IF NOT EXISTS statements
 * migrate caches created by older app versions.
 */
export async function initPGLiteDB(db: PGlite) {
  try {
    await db.waitReady;
    await db.exec(PGLITE_INIT_SQL);
  } catch (e) {
    console.error("An error occurred", e);
  }
}

export function getDB() {
  if (!localDB) {
    localDB = new PGlite("idb://site-data");
  }
  return localDB;
}
