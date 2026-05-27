import {
  BuildingData,
  CollegeData,
  DivisionData,
  DormData,
  RoomData,
} from "../../types";

export const API_ROUTES = [
  "/buildings",
  "/colleges",
  "/divisions",
  "/dorms",
  "/rooms",
] as const;

type ReturnAllData = [
  BuildingData[],
  CollegeData[],
  DivisionData[],
  DormData[],
  RoomData[],
];

export async function syncData(): Promise<{
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
      // TODO: add sync utility fn for the tables

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

export async function getAllData() {
  return Promise.all(API_ROUTES.map((url) => getJSONFetch(url)));
}

export async function getJSONFetch(url: string) {
  const req = await fetch(url);
  return await req.json();
}

export function gettotalDataLength(...arrays: any[][]): number {
  return arrays.reduce((acc, curr) => acc + curr.length, 0);
}
