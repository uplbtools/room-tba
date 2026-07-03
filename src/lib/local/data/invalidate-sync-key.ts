import { getSyncKeysFromLs } from "./sync-keys";

/** Drop cached sync keys so the next campus fetch pulls fresh server rows. */
export function invalidateLocalSyncKeys(tableNames: string[]): void {
  if (typeof localStorage === "undefined") return;
  const syncKeys = getSyncKeysFromLs();
  if (!syncKeys) return;
  for (const table of tableNames) {
    delete syncKeys[table];
  }
  localStorage.setItem("sync-key", JSON.stringify(syncKeys));
}

export const CAMPUS_DATA_REFRESH_EVENT = "room-tba:campus-data-refresh";

export function requestCampusDataRefresh(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CAMPUS_DATA_REFRESH_EVENT));
}
