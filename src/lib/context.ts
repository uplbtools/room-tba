import { createContext } from "svelte";
import { BuildingData, CollegeData, DivisionData, DormData } from "./types";
export type AppContextData = {
  buildings: BuildingData[] | null;
  colleges: CollegeData[] | null;
  divisions: DivisionData[] | null;
  dorms: DormData[] | null;
  totalRooms: number | null;
  directionCount: number | null;
  loaded: boolean;
}
export type DBData = Omit<AppContextData, "loaded">

export const [getAppData, setAppData] = createContext<() => AppContextData>();
