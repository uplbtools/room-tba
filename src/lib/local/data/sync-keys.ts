import { fetchJsonWithRetry, SYNC_CHECK_FETCH_OPTIONS } from "./fetch-json";

type SyncKeyResponse = {
  success: boolean;
  error: string | null;
  data: Record<string, string | null> | null;
};

/**
 * Shared in-flight probe of `/api/check` (#866). Boot asks for eight tables in
 * the same tick and they all await this one request instead of firing eight
 * `/api/check/<table>` probes. Cleared once it settles, so a later refresh
 * (coming back online, an admin write) re-probes and never reads a stale key.
 */
let syncKeysInFlight: Promise<Record<string, string | null>> | null = null;

/** Remote sync key for one table; null when the registry is unreachable. */
export async function getSyncKey(table: string): Promise<string | null> {
  try {
    if (!syncKeysInFlight) {
      syncKeysInFlight = fetchJsonWithRetry<SyncKeyResponse>(
        "/api/check",
        SYNC_CHECK_FETCH_OPTIONS,
      )
        .then((response) => response.data ?? {})
        .finally(() => {
          syncKeysInFlight = null;
        });
    }
    return (await syncKeysInFlight)[table] ?? null;
  } catch (e) {
    console.error(e);
    return null;
  }
}

/** LocalStorage sync-key helpers (no PGlite imports). */
export function getSyncKeysFromLs(): {
  [key: string]: string;
} | null {
  const lsStore = localStorage.getItem("sync-key");

  if (lsStore === null) {
    localStorage.setItem(
      "sync-key",
      `{
      "buildings": "",
      "colleges": "",
      "divisions": "",
      "rooms": "",
      "dorms": "",
      "classes": "",
      "final_exams": "",
      "events": "",
      "organizations": "",
      "places": "",
      "announcements": ""
    }`,
    );
    return null;
  }

  try {
    const keys = JSON.parse(lsStore);
    if (typeof keys === "object" && "buildings" in keys) {
      return keys as {
        [key: string]: string;
      };
    } else {
      return null;
    }
  } catch {
    console.error("Error: the sync keys in the localStorage was corrupted");
    localStorage.setItem(
      "sync-key",
      `{
      "buildings": "",
      "colleges": "",
      "divisions": "",
      "rooms": "",
      "dorms": "",
      "classes": "",
      "final_exams": "",
      "events": "",
      "organizations": "",
      "places": "",
      "announcements": ""
    }`,
    );
    return null;
  }
}
