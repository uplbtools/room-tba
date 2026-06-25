import { createContext } from "svelte";
import {
  BuildingData,
  CollegeData,
  DivisionData,
  DormData,
  EventData,
} from "./types";
export type AppContextData =
  | {
      buildings: BuildingData[];
      colleges: CollegeData[];
      divisions: DivisionData[];
      dorms: DormData[];
      events: EventData[];
      totalRooms: number;
      directionCount: number;
      loaded: true;
    }
  | {
      buildings: null;
      colleges: null;
      divisions: null;
      dorms: null;
      events: null;
      totalRooms: null;
      directionCount: null;
      loaded: false;
    };
export type DBData = Omit<AppContextData, "loaded">;

export const [getAppData, setAppData] = createContext<() => AppContextData>();
