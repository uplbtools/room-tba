import {
  buildingsTable,
  dormsTable,
  eventLocationsTable,
  eventRouteStopsTable,
  eventRoutesTable,
  eventsTable,
  roomPositionsTable,
  termsTable,
} from "@drizzle/schema";
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
  version: number;
  updatedAt: string;
};

type BuildingData = typeof buildingsTable.$inferSelect;

type BuildingType = BuildingData["buildingType"];

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
  version: number;
  updatedAt: string;
};

type DivisionData = {
  id: number;
  divisionName: string;
  collegeId: number | null;
  version: number;
  updatedAt: string;
};

type DormData = typeof dormsTable.$inferSelect;

type Term = typeof termsTable.$inferSelect;

// A term plus how many classes are tagged with it, for the term selector UI.
type TermWithCount = Term & { classCount: number };

type EventCategory = typeof eventsTable.$inferSelect.category;

type EventRecurrence = typeof eventsTable.$inferSelect.recurrence;

type EventLocationAnchorType =
  typeof eventLocationsTable.$inferSelect.anchorType;

type EventStatus = "active" | "upcoming" | "past";

type EventData = typeof eventsTable.$inferSelect & {
  status: EventStatus;
  occurrenceStartsAt: string;
  occurrenceEndsAt: string;
  locations: EventLocationData[];
  routes: EventRouteData[];
};

type EventLocationData = typeof eventLocationsTable.$inferSelect & {
  resolvedLat: number | null;
  resolvedLon: number | null;
  resolvedLabel: string;
  buildingName: string | null;
  dormName: string | null;
};

type EventRouteData = typeof eventRoutesTable.$inferSelect & {
  stops: EventRouteStopData[];
};

type EventRouteStopData = typeof eventRouteStopsTable.$inferSelect & {
  resolvedLat: number | null;
  resolvedLon: number | null;
  resolvedLabel: string;
};

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
  eventSlug?: string;
}

type TableSyncInfo = {
  valid: boolean;
  newKey: string | null;
};

type EntityLoadResult<T> = {
  rows: T[];
  source: "remote" | "cache";
};
