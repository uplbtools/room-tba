import { type DBData } from "../../context";
import {
  BuildingData,
  ClassMapValue,
  CollegeData,
  DivisionData,
  DormData,
} from "../../types";
import {
  getLocalBuildings,
  getLocalClasses,
  getLocalColleges,
  getLocalDivisions,
  getLocalDorms,
} from "./sync";

export async function getJSONFetch<T>(url: string) {
  const req = await fetch(url);
  return (await req.json()) as T;
}


export async function isLocalDataValid(): Promise<boolean> {
  const syncKeys = getSyncKeysFromLs();
  if (syncKeys === null) return false;
  for (const [table, key] of Object.entries(syncKeys)) {
    if (key === "") return false;
    const onlineKey = await getSyncKey(table);
    if (onlineKey === null || key !== onlineKey) return false;
  }
  return true;
}

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
      "classes": ""
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
  } catch (e) {
    console.error("Error: the sync keys in the localStorage was corrupted");
    localStorage.setItem(
      "sync-key",
      `{
      "buildings": "",
      "colleges": "",
      "divisions": "",
      "rooms": "",
      "dorms": "",
      "classes": ""
    }`,
    );
    return null;
  }
}

export async function localTableSyncCheck(tableName: string): Promise<{
  valid: boolean;
  newKey: string | null;
}> {
  try {
    const remoteSyncKey = await getSyncKey(tableName);
    const syncKeyLs = getSyncKeysFromLs();
    if (syncKeyLs === null)
      return {
        valid: false,
        newKey: remoteSyncKey,
      };
    const tableSyncKey = syncKeyLs[tableName];
    return {
      valid:
        typeof tableSyncKey === "string" &&
        remoteSyncKey !== null &&
        tableSyncKey === remoteSyncKey,
      newKey: remoteSyncKey,
    };
  } catch (e) {
    console.error(e);
    return {
      valid: false,
      newKey: null,
    };
  }
}

export function updateSyncKeyFromLs(tableName: string, newKey: string) {
  const syncKeys = getSyncKeysFromLs();
  if (syncKeys === null) return;
  syncKeys[tableName] = newKey;
  localStorage.setItem("sync-key", JSON.stringify(syncKeys));
}

export async function getSyncKey(table: string) {
  try {
    const tableOnline = await getJSONFetch<{
      success: boolean;
      error: string | null;
      data: {
        id: number;
        tableName: string | null;
        syncKey: string | null;
      };
    }>(`/api/check/${table}`);
    return tableOnline.data.syncKey;
  } catch (e) {
    console.error(e);
    return null;
  }
}

export function getEntity<T>(
  tableName: string,
  getLocalEntity: () => Promise<T[] | undefined>,
): () => Promise<T[]> {
  return async () => {
    try {
      const res = await localTableSyncCheck(tableName);
      if (res.valid) {
        const data = await getLocalEntity();
        return data ?? [];
      }
      const fetchedData = await getJSONFetch<T[]>(`/api/${tableName}`);
      return fetchedData;
    } catch (e) {
      return [];
    }
  };
}

export const getBuildings = getEntity<BuildingData>(
  "buildings",
  getLocalBuildings,
);

export const getColleges = getEntity<CollegeData>(
  "colleges",
  getLocalColleges,
);

export const getDivisions = getEntity<DivisionData>(
  "divisions",
  getLocalDivisions,
);

export const getDorms = getEntity<DormData>("dorms", getLocalDorms);

export const getClasses = getEntity<ClassMapValue>(
  "classes",
  getLocalClasses,
);

export async function getRoomsData(): Promise<
  Pick<DBData, "directionCount" | "totalRooms">
> {
  try {
    const fetchedRoomsData =
      await getJSONFetch<Pick<DBData, "directionCount" | "totalRooms">>(
        "/api/rooms-update",
      );
    return fetchedRoomsData;
  } catch (e) {
    return {
      directionCount: 0,
      totalRooms: 0,
    };
  }
}
