import type { PGlite } from "@electric-sql/pglite";
import { PGLITE_INIT_SQL } from "./pglite-schema.generated";

let dbPromise: Promise<PGlite> | null = null;
let ready = false;

/**
 * The offline cache, hydrated on first use.
 *
 * PGlite is ~5 MB of wasm + data (#866), so it is imported dynamically: it
 * stays out of the entry bundle and downloads alongside the first campus
 * fetch instead of in front of it. The DDL is generated from drizzle/schema.ts
 * (see scripts/generate-pglite-schema.ts), so the server schema is the single
 * source of truth; ADD COLUMN IF NOT EXISTS statements migrate caches created
 * by older app versions. It runs here, so every caller gets an initialised
 * database and nothing has to sequence init before its own queries.
 */
export function getDB(): Promise<PGlite> {
  dbPromise ??= (async () => {
    const { PGlite } = await import("@electric-sql/pglite");
    const db = new PGlite("idb://site-data");
    await db.waitReady;
    try {
      await db.exec(PGLITE_INIT_SQL);
    } catch (e) {
      console.error("An error occurred", e);
    }
    ready = true;
    return db;
  })();
  return dbPromise;
}

/**
 * True once the cache is queryable. Callers that only want a cached row *if
 * one is already there* check this first, so an empty first-visit cache does
 * not make them wait out the wasm download (#866).
 */
export function isLocalCacheReady(): boolean {
  return ready;
}

/**
 * Close the offline cache so its IndexedDB database can be deleted (#865).
 * No-op when nothing opened it — deliberately does not call `getDB()`, which
 * would boot the WASM engine just to shut it down again.
 */
export async function closeLocalDB(): Promise<void> {
  if (!dbPromise) return;
  const pending = dbPromise;
  dbPromise = null;
  ready = false;
  try {
    const db = await pending;
    await db.close();
  } catch {
    // Never opened successfully, so there is nothing to close.
  }
}
