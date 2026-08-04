/**
 * Manual "Resync campus data" (Settings → Storage): drop the cached sync keys
 * and ask the app to refetch buildings/rooms/classes/… from the server.
 *
 * The light counterpart to `clearCachedData()` — downloaded offline map tiles
 * and the service worker are left alone. This is for data that looks stale or
 * wrong, not for a broken install.
 *
 * `requestCampusDataRefresh()` only dispatches an event; the listener in
 * `AppRoot.svelte` calls `refreshFromNetwork()` fire-and-forget, so there is
 * no promise to await. The outcome is read off the sync store instead, which
 * the caller injects so this stays free of Svelte runes and unit-testable.
 */

import {
  invalidateLocalSyncKeys,
  requestCampusDataRefresh,
} from "@lib/local/data/invalidate-sync-key";
import { SYNC_TABLE_NAMES } from "@lib/local/data/sync-keys";

/** The two terminal fields of `SyncToastStore`: `endSync()` sets `allSynced`, `setSyncError()` sets `syncError`. */
export type SyncStatus = {
  allSynced: boolean;
  syncError: string | null;
};

export type ResyncOutcome = "synced" | "failed" | "timeout";

// ponytail: 250ms polling rather than an $effect subscription — this runs
// outside a component root, and a campus sync takes seconds, so the
// granularity is irrelevant. Swap to a store subscription if it ever needs to
// drive a progress bar.
const POLL_MS = 250;
const TIMEOUT_MS = 60_000;

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Invalidate every sync key, request a refresh, and resolve once the sync
 * store reports a terminal state.
 *
 * Never rejects and never hangs: an unheard request resolves `"failed"`
 * immediately, and a sync that never finishes resolves `"timeout"`.
 */
export async function resyncCampusData(
  readStatus: () => SyncStatus,
  options: { timeoutMs?: number; pollMs?: number } = {},
): Promise<ResyncOutcome> {
  const timeoutMs = options.timeoutMs ?? TIMEOUT_MS;
  const pollMs = options.pollMs ?? POLL_MS;

  invalidateLocalSyncKeys([...SYNC_TABLE_NAMES]);
  requestCampusDataRefresh();

  // `refreshFromNetwork()` calls `startRemoteFetch()` synchronously, which
  // clears `allSynced`, and `dispatchEvent` runs listeners synchronously. So a
  // still-true `allSynced` here means nothing handled the request — report it
  // rather than reporting the previous sync's success.
  if (readStatus().allSynced) return "failed";

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const status = readStatus();
    if (status.syncError !== null) return "failed";
    if (status.allSynced) return "synced";
    await sleep(pollMs);
  }
  return "timeout";
}
