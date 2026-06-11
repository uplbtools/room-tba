import { type DBData } from "../../context";
import { syncAllData, syncBuildings } from "./utils";

export const API_ROUTES = [
  "/api/buildings",
  "/api/colleges",
  "/api/divisions",
  "/api/dorms",
  "/api/rooms",
] as const;

// TODO: change the behavior of the fn
export async function syncAppData(data: DBData): Promise<{
  success: boolean;
  error: Error | null;
}> {
  const syncKeys = getSyncKeysFromLs();

  if (syncKeys === null) {
    try {
      await syncAllData(data);
    } catch (e) {
      console.error(e);
      return {
        success: false,
        error: new Error("Failed to sync data")
      }
    }
  }

  // TOOD: implement the function
  if (await isLocalDataValid()) {
    // if (syncKeys["building"] !== )
  }

  return {
    success: true,
    error: null,
  };
}

// TODO: change the behavior of the fn
export async function fetchAppData(): Promise<DBData> {
  return {
    buildings: null,
    colleges: null,
    classesMap: null,
    directionCount: null,
    divisions: null,
    dorms: null,
    rooms: null,
    totalRooms: null,
  };
}

export async function getJSONFetch(url: string) {
  const req = await fetch(url);
  return await req.json();
}

export function gettotalDataLength(...arrays: any[][]): number {
  return arrays.reduce((acc, curr) => acc + curr.length, 0);
}

// TODO: implement local data retrieval fn
export async function getLocalAppData(): Promise<DBData> {
  return {
    buildings: null,
    colleges: null,
    classesMap: null,
    directionCount: null,
    divisions: null,
    dorms: null,
    rooms: null,
    totalRooms: null,
  };
}

// TODO: implement predicate fn
export async function isLocalDataValid(): Promise<boolean> {
  const syncKeys = getSyncKeysFromLs();
  if (syncKeys === null) return false;
  for (const [table, key] of Object.entries(syncKeys)) {
    try {
      const tableOnline = (await getJSONFetch(`/api/check/${table}`)) as {
        key: string;
      };
      if (key !== tableOnline.key) return false;
    } catch (e) {
      console.log(e);
      return false;
    }
  }
  return true;
}

function getSyncKeysFromLs(): {
  [key: string]: string;
} | null {
  const lsStore = localStorage.getItem("sync-key");

  if (typeof lsStore !== "string") return null;

  try {
    const keys = JSON.parse(lsStore);
    if (typeof keys === "object" && "building" in keys) {
      return keys as {
        [key: string]: string;
      };
    } else {
      return null;
    }
  } catch (e) {
    console.log("Error: the sync keys in the localStorage was corrupted");
    return null;
  }
}
