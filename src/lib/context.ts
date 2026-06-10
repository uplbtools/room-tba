import { createContext } from "svelte";
import { BuildingData, ClassMapValue, CollegeData, DivisionData, DormData, RoomData } from "./types";
export type AppContextData = {
  rooms: RoomData[] | null;
  buildings: BuildingData[] | null;
  colleges: CollegeData[] | null;
  divisions: DivisionData[] | null;
  dorms: DormData[] | null;
  classesMap: Map<string, ClassMapValue[]> | null;
  totalRooms: number | null;
  directionCount: number | null;
  loaded: boolean;
}
export type DBData = Omit<AppContextData, "loaded">

export const [getAppData, setAppData] = createContext<AppContextData>();
