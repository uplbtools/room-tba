import { createContext } from "svelte";
import { BuildingData, ClassMapValue, CollegeData, DivisionData, DormData, RoomData } from "./types";
export type AppContextData = {
  rooms: RoomData[];
  buildings: BuildingData[];
  colleges: CollegeData[];
  divisions: DivisionData[];
  dorms: DormData[];
  classesMap: Map<string, ClassMapValue[]>;
  totalRooms: number;
  directionCount: number;
}


export const [getAppData, setAppData] = createContext<AppContextData>();
