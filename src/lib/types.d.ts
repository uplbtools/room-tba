import { dormsTable, roomPositionsTable } from "../../drizzle/schema";
import type { QueryStoreState } from "./store.svelte";

export type AppData = {
  buildings: {
    [key: string]: {
      rooms: string[];
      directions: string;
      lat: number;
      lon: number;
      osm_link: string;
    };
  };
  colleges: {
    [key: string]: string[];
  };
  divisions: {
    [key: string]: string[];
  };
  rooms: {
    [key: string]: {
      building: string | null;
      college: string | null;
      division: string | null;
      classes: {
        course_code: string;
        section: string;
        type: "LAB" | "LEC" | "SEM";
        schedule: string[];
        course_title: string;
      }[];
    };
  };
};

type RoomData = {
  id: number;
  code: string;
  directions: string | null;
  building: {
    name: string;
    lat: number | null;
    lon: number | null;
    directions: string | null;
  } | null;
  buildingId: number | null;
  collegeId: number | null;
  divisionId: number | null;
  collegeName: string | null;
  divisionName: string | null;
};

type BuildingData = {
  id: number;
  buildingName: string;
  lat: number | null;
  lon: number | null;
  directions: string | null;
};

type ClassMapValue = {
  courseCode: string | null;
  roomCode: string | null;
  section: string | null;
  type: string | null;
  schedule: string[] | null;
  directions: string | null;
  courseTitle: string | null;
  roomId: number | null;
  termId: number | null;
  id: number;
};

type CollegeData = {
  id: number;
  collegeName: string;
};

type DivisionData = {
  id: number;
  divisionName: string;
};

type DormData = typeof dormsTable.$inferSelect;

type RoomPosition = typeof roomPositionsTable.$inferSelect;

interface ContributorInfo {
  name: string;
  href?: string;
  img_alt?: string;
}

interface DeveloperInfo {
  name: string;
  href?: string;
  img_alt?: string;
}

interface RecentSearch {
  category: Exclude<QueryStoreState["category"], null>;
  value: string;
}
