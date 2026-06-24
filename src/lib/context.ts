import { createContext } from "svelte";
import { BuildingData, ClassMapValue, CollegeData, DivisionData, DormData } from "./types";
export type AppContextData = {
  buildings: BuildingData[];
  classes: ClassMapValue[];
  colleges: CollegeData[];
  divisions: DivisionData[];
  dorms: DormData[];
  totalRooms: number;
  directionCount: number;
  loaded: true;
} | {
  buildings:null;
  classes:null;
  colleges:null;
  divisions:null;
  dorms:null;
  totalRooms:null;
  directionCount:null;
  loaded: false;
}
export type DBData = {
  buildings: BuildingData[];
  classes: ClassMapValue[];
  colleges: CollegeData[];
  divisions: DivisionData[];
  dorms: DormData[];
  totalRooms: number;
  directionCount: number;
}

export const [getAppData, setAppData] = createContext<() => AppContextData>();
