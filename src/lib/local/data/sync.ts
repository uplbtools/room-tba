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

function getSyncKeysFromLs(): {
  [key: string]: string;
} | null {
  const lsStore = localStorage.getItem("sync-key");

  if (lsStore === null) {
    localStorage.setItem(
      "sync-key",
      `{
      buildings: "",
      colleges: "",
      divisions: "",
      rooms: "",
      dorms: "",
      classes: ""
    }`,
    );
    return null;
  }

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
    localStorage.setItem(
      "sync-key",
      `{
      buildings: "",
      colleges: "",
      divisions: "",
      rooms: "",
      dorms: "",
      classes: ""
    }`,
    );
    return null;
  }
}

export async function isLocalTableValid(tableName: string): Promise<boolean> {
  const syncKeyLs = getSyncKeysFromLs();
  if (syncKeyLs === null) return false;
  try {
    const tableSyncKey = syncKeyLs[tableName];
    const remoteSyncKey = await getSyncKey(tableName);
    return (
      typeof tableSyncKey === "string" &&
      remoteSyncKey !== null &&
      tableSyncKey === remoteSyncKey
    );
  } catch (e) {
    console.error(e);
    return false;
  }
}

async function getSyncKey(table: string) {
  try {
    const tableOnline = (await getJSONFetch<{
      success: boolean;
      error: string | null;
      data: {
        id: number;
        tableName: string | null;
        syncKey: string | null;
      };
    }>(`/api/check/${table}`));
    return tableOnline.data.syncKey;
  } catch (e) {
    console.error(e);
    return null;
  }
}

export async function getSyncedBuildings(): Promise<BuildingData[]> {
  if (await isLocalTableValid("buildings"))
    return (await getLocalBuildings()) ?? [];

  try {
    const fetchedBuildings =
      await getJSONFetch<BuildingData[]>("/api/buildings");
    return fetchedBuildings;
  } catch (e) {
    return [];
  }
}

export async function getSyncedColleges(): Promise<CollegeData[]> {
  if (await isLocalTableValid("colleges"))
    return (await getLocalColleges()) ?? [];

  try {
    const fetchedColleges = await getJSONFetch<CollegeData[]>("/api/colleges");
    return fetchedColleges;
  } catch (e) {
    return [];
  }
}

export async function getSyncedDivisions(): Promise<DivisionData[]> {
  if (await isLocalTableValid("divisions"))
    return (await getLocalDivisions()) ?? [];

  try {
    const fetchedDivisions =
      await getJSONFetch<DivisionData[]>("/api/divisions");
    return fetchedDivisions;
  } catch (e) {
    return [];
  }
}

export async function getSyncedDorms(): Promise<DormData[]> {
  if (await isLocalTableValid("dorms")) return (await getLocalDorms()) ?? [];

  try {
    const fetchedDorms = await getJSONFetch<DormData[]>("/api/dorms");
    return fetchedDorms;
  } catch (e) {
    return [];
  }
}
export async function getSyncedRooms(): Promise<RoomData[]> {
  // if (await isLocalTableValid("rooms"))

  try {
    const fetchedRooms = await getJSONFetch<RoomData[]>("/api/rooms");
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
