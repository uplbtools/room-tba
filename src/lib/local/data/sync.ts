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

export async function fetchAppData(): Promise<DBData> {
  const data =  Promise.all(API_ROUTES.map((url) => getJSONFetch(url)));

  return {
      buildings: null,
      colleges: null,
      classesMap: null,
      directionCount: null,
      divisions: null,
      dorms: null,
      rooms: null,
      totalRooms : null,
    }
}

export async function getJSONFetch(url: string) {
  const req = await fetch(url);
  return await req.json();
}

export function gettotalDataLength(...arrays: any[][]): number {
  return arrays.reduce((acc, curr) => acc + curr.length, 0);
}

export async function getLocalAppData(): Promise<DBData> {
  return {
    buildings: null,
    colleges: null,
    classesMap: null,
    directionCount: null,
    divisions: null,
    dorms: null,
    rooms: null,
    totalRooms : null,
  }
}

export async function isLocalDataValid(): boolean {
  return false;
}
