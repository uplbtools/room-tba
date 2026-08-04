/**
 * Wipe this device's app cache so a returning visitor can recover from a bad
 * bundle or a stuck service worker without devtools (#865).
 *
 * **The user's own work survives.** Planner plans, and the small preference
 * keys below, are never touched — which is why this never calls
 * `localStorage.clear()`. Anything added here that touches localStorage must
 * remove named keys only.
 *
 * `src/layouts/Layout.astro` has a smaller copy of the service-worker + Cache
 * Storage teardown inside its boot watchdog. It is `is:inline` (it must run
 * before any module loads, precisely for the case where the bundle is broken),
 * so it cannot import this file. Keep the two in step by hand.
 */

import { clearMapCaches } from "@lib/local/offline-maps";
import { closeLocalDB } from "@lib/local/data/pgliteDB";
import { invalidateLocalSyncKeys } from "@lib/local/data/invalidate-sync-key";
import { getSyncKeysFromLs } from "@lib/local/data/sync-keys";
import { PLANNER_LS_KEY } from "@lib/stores/store-types";

/** IndexedDB database behind PGlite's `idb://site-data` (emscripten IDBFS mounts at `/pglite/<dataDir>`). */
export const PGLITE_IDB_NAME = "/pglite/site-data";

/**
 * localStorage keys a clear must leave alone. The planner key is the user's
 * own work; the rest are preferences that are annoying, not dangerous, to lose.
 */
export const PRESERVED_LOCAL_KEYS = [
  PLANNER_LS_KEY,
  "hideLandingModal",
  "recent-search",
  "sidebar-expanded",
] as const;

/** A failed step must not abort the rest of the clear. */
async function step(label: string, run: () => Promise<void> | void) {
  try {
    await run();
  } catch (error) {
    console.error(`Clear cached data: ${label} failed`, error);
  }
}

async function unregisterServiceWorkers(): Promise<void> {
  if (!navigator.serviceWorker) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((reg) => reg.unregister()));
}

/** App shell, workbox precache, `map-tiles`, `map-assets` — everything on this origin. */
async function deleteCacheStorage(): Promise<void> {
  if (!("caches" in window)) return;
  // Named drop of the downloaded offline maps first, so the intent survives
  // even if the sweep below is ever narrowed to a prefix.
  await clearMapCaches();
  const keys = await caches.keys();
  await Promise.all(keys.map((key) => caches.delete(key)));
}

/**
 * Drop the PGlite campus cache so campus data re-syncs from the server.
 *
 * ponytail: resolve on `blocked` instead of waiting it out. A blocked delete
 * stays queued and completes when the last connection closes, which the reload
 * does anyway; hanging here would strand the user on a spinner.
 */
async function deletePgliteDatabase(): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  await closeLocalDB();
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase(PGLITE_IDB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}

/** Forget every cached sync key so the next fetch pulls fresh server rows. */
function clearSyncKeys(): void {
  if (typeof localStorage === "undefined") return;
  const syncKeys = getSyncKeysFromLs();
  if (syncKeys) invalidateLocalSyncKeys(Object.keys(syncKeys));
}

/**
 * Clear caches, the offline campus database, and sync keys. Resolves even when
 * individual steps fail — the caller reloads either way, and a reload on a
 * partial clear still beats leaving the user stuck.
 *
 * Does **not** reload; the caller owns that.
 */
export async function clearCachedData(): Promise<void> {
  await step("service worker unregister", unregisterServiceWorkers);
  await step("cache storage", deleteCacheStorage);
  await step("campus database", deletePgliteDatabase);
  await step("sync keys", clearSyncKeys);
}
