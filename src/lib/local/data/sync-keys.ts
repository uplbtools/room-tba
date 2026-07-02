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
      "events": ""
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
      "events": ""
    }`,
    );
    return null;
  }
}
