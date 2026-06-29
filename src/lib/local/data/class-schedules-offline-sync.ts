import { localTableSyncCheck } from "./sync";
import { getClasses } from "./utils";
import { syncClasses } from "./sync";

export const OFFLINE_CLASSES_SYNCED_AT_KEY = "offline-classes-synced-at";

export async function syncClassSchedulesForOffline(options?: {
  onProgress?: (label: string) => void;
}): Promise<{ ok: boolean; error?: string; rowCount: number }> {
  options?.onProgress?.("Fetching class schedules…");
  try {
    const checker = await localTableSyncCheck("classes");
    const load = await getClasses(checker);
    options?.onProgress?.(`Saving ${load.rows.length} classes offline…`);
    await syncClasses(checker, load.rows, load.source === "remote");
    localStorage.setItem(
      OFFLINE_CLASSES_SYNCED_AT_KEY,
      new Date().toISOString(),
    );
    return { ok: true, rowCount: load.rows.length };
  } catch (error) {
    console.error("Class schedule offline sync failed:", error);
    return {
      ok: false,
      rowCount: 0,
      error:
        error instanceof Error
          ? error.message
          : "Class schedule download failed.",
    };
  }
}
