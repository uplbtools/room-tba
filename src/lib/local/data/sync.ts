import { type DBData } from "../../context";
import {
  BuildingData,
  ClassMapValue,
  CollegeData,
  DivisionData,
  DormData,
  RoomData,
} from "../../types";
import {
  getLocalBuildings,
  getLocalColleges,
  getLocalDivisions,
  getLocalDorms,
  syncBuildings,
  syncClasses,
  syncColleges,
  syncDivisions,
  syncDorms,
  syncRooms,
} from "./utils";

export async function getJSONFetch<T>(url: string) {
  const req = await fetch(url);
  return (await req.json()) as T;
}

export function gettotalDataLength(...arrays: any[][]): number {
  return arrays.reduce((sum, curr) => sum + curr.length, 0);
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

export async function localTableCheck(tableName: string): Promise<{
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

function updateSyncKeyFromLs(tableName: string, newKey: string) {
  const syncKeys = getSyncKeysFromLs();
  console.log(syncKeys);
  console.log(newKey);
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

export function getSyncedTable<T>(
  tableName: string,
  localDataService: () => Promise<T[] | undefined>,
  localSyncService: (b: T[]) => Promise<void>,
): () => Promise<T[]> {
  return async () => {
    try {
      const res = await localTableCheck(tableName);
      if (res.valid) return (await localDataService()) ?? [];

      console.log(res);
      const fetchedData = await getJSONFetch<T[]>(`/api/${tableName}`);
      updateSyncKeyFromLs(tableName, res.newKey ?? "");
      await localSyncService(fetchedData);
      return fetchedData;
    } catch (e) {
      return [];
    }
  };
}

export const getSyncedBuildings = getSyncedTable<BuildingData>(
  "buildings",
  getLocalBuildings,
  syncBuildings,
);

export const getSyncedColleges = getSyncedTable<CollegeData>(
  "colleges",
  getLocalColleges,
  syncColleges,
);

export const getSyncedDivisions = getSyncedTable<DivisionData>(
  "divisions",
  getLocalDivisions,
  syncDivisions,
);

export const getSyncedDorms = getSyncedTable<DormData>("dorms", getLocalDorms, syncDorms);

export async function getSyncedRooms(): Promise<RoomData[]> {
  // if (await isLocalTablevalidid("rooms"))

  try {
    const fetchedRooms = await getJSONFetch<RoomData[]>("/api/rooms");

    await syncRooms(fetchedRooms);
    return fetchedRooms;
  } catch (e) {
    return [];
  }
}

export async function getSyncedClasses(): Promise<
  Map<string, ClassMapValue[]>
> {
  try {
    const fetchedClasses = await getJSONFetch<ClassMapValue[]>("/api/classes");

    await syncClasses(fetchedClasses);

    const classesMap = new Map<string, ClassMapValue[]>();
    fetchedClasses.forEach((classData) => {
      const roomCode = classData.roomCode ?? "No room";
      if (!classesMap.has(roomCode)) {
        classesMap.set(roomCode, [classData]);
      } else {
        classesMap.get(roomCode)?.push(classData);
      }
    });
    return classesMap;
  } catch {
    return new Map();
  }
}

export async function getSyncedRoomsData(): Promise<
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
