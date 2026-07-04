import { createContext } from "svelte";
import type {
  BuildingData,
  CollegeData,
  DivisionData,
  DormData,
  EventData,
} from "@lib/types";
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

export type AppActions = {
  replaceEvent: (event: EventData) => void;
  removeEvent: (eventId: number) => void;
  upsertBuilding: (building: BuildingData) => void;
  upsertDorm: (dorm: DormData) => void;
  upsertCollege: (college: CollegeData) => void;
  upsertDivision: (division: DivisionData) => void;
};

export const [getAppData, setAppData] = createContext<() => AppContextData>();
export const [getAppActions, setAppActions] = createContext<AppActions>();
