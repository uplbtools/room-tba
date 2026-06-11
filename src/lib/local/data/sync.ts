import { type DBData } from "../../context";
import {
  BuildingData,
  CollegeData,
  DivisionData,
  DormData,
  RoomData,
} from "../../types";
import { syncBuildings } from "./utils";

export const API_ROUTES = [
  "/api/buildings",
  "/api/colleges",
  "/api/divisions",
  "/api/dorms",
  "/api/rooms",
] as const;

type ReturnAllData = [
  BuildingData[],
  CollegeData[],
  DivisionData[],
  DormData[],
  RoomData[],
];

// TODO: change the behavior of the fn
export async function syncAppData(data: DBData): Promise<{
  success: boolean;
  error: Error | null;
}> {
  const localSyncHash = localStorage.getItem("sync-hash");
  const current = await (await fetch("/api/check-sync")).text();

  if (localSyncHash === null || localSyncHash !== current) {
    try {
      const [buildings, colleges, divisions, dorms, rooms] =
        (await getAllData()) as ReturnAllData;

      const dataLength = gettotalDataLength(
        buildings,
        colleges,
        divisions,
        dorms,
        rooms,
      );

      console.log(dataLength, [colleges, buildings, divisions, dorms, rooms]);
      // TODO: add sync utility fn for the tables
      await syncBuildings(buildings);

      return {
        success: true,
        error: null,
      };
    } catch {
      const err = new Error("Failed to sync data");
      return {
        success: false,
        error: err,
      };
    }
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
  const syncKeys = getKeysFromLs();
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

function getKeysFromLs(): {
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
