// src/lib/app-data.ts

import { count, eq, isNotNull } from "drizzle-orm";
import {
  buildingsTable,
  classesTable,
  collegesTable,
  divisionsTable,
  dormsTable,
  roomsTable,
} from "@drizzle/schema";
import { db } from "./db";
import { getDefaultTerm } from "./services/term-service";
import { slugifySegment } from "./site";
import { getAllEvents } from "./services/event-service";
import type {
  BuildingData,
  ClassMapValue,
  CollegeData,
  DivisionData,
  DormData,
  EventData,
  RoomData,
} from "@lib/types";

export type SearchCategory =
  | "building"
  | "division"
  | "college"
  | "room"
  | "dorm"
  | "organization"
  | "place"
  | "event";

export type InitialSearchState = {
  category: SearchCategory;
  value: string;
  eventSlug?: string;
};

export type AppPageData = {
  rooms: RoomData[];
  buildings: BuildingData[];
  colleges: CollegeData[];
  divisions: DivisionData[];
  dorms: DormData[];
  events: EventData[];
  classesMap: Map<string, ClassMapValue[]>;
  totalRooms: number;
  directionCount: number;
  // The term whose schedules `classesMap` reflects (default term), or null
  // when no terms are configured yet.
  activeTermId: number | null;
};

let appDataPromise: Promise<AppPageData> | undefined;

export function loadAppData() {
  if (!appDataPromise) {
    appDataPromise = fetchAppData();
  }

  return appDataPromise;
}

async function fetchAppData(): Promise<AppPageData> {
  const rooms = await db
    .select({
      id: roomsTable.id,
      code: roomsTable.roomCode,
      directions: roomsTable.directions,
      building: {
        name: buildingsTable.buildingName,
        lat: buildingsTable.lat,
        lon: buildingsTable.lon,
        directions: buildingsTable.directions,
      },
      collegeName: collegesTable.collegeName,
      divisionName: divisionsTable.divisionName,
    })
    .from(roomsTable)
    .leftJoin(buildingsTable, eq(buildingsTable.id, roomsTable.buildingId))
    .leftJoin(divisionsTable, eq(divisionsTable.id, roomsTable.divisionId))
    .leftJoin(collegesTable, eq(collegesTable.id, roomsTable.collegeId));

  // Class counts/maps reflect the default term so SSG/SEO pages stay
  // consistent with the term the interactive UI shows by default.
  const defaultTerm = await getDefaultTerm();

  const classes = await db
    .select({
      courseCode: classesTable.courseCode,
      roomCode: roomsTable.roomCode,
      section: classesTable.section,
      type: classesTable.type,
      schedule: classesTable.schedule,
      directions: roomsTable.directions,
      courseTitle: classesTable.courseTitle,
    })
    .from(classesTable)
    .leftJoin(roomsTable, eq(roomsTable.id, classesTable.roomId))
    .where(defaultTerm ? eq(classesTable.termId, defaultTerm.id) : undefined);

  const buildings = await db.select().from(buildingsTable);
  const colleges = await db.select().from(collegesTable);
  const divisions = await db.select().from(divisionsTable);
  const dorms = await db.select().from(dormsTable);
  const events = await getAllEvents();

  const classesMap = new Map<string, ClassMapValue[]>();
  classes.forEach((classData) => {
    const roomCode = classData.roomCode ?? "No room";
    if (!classesMap.has(roomCode)) {
      classesMap.set(roomCode, [classData]);
    } else {
      classesMap.get(roomCode)?.push(classData);
    }
  });

  rooms.sort((a, b) => {
    const countA = classesMap.get(a.code)?.length ?? 0;
    const countB = classesMap.get(b.code)?.length ?? 0;
    return countB - countA;
  });

  // @ts-expect-error drizzle returns count as a scalar row here.
  const [{ count: directionCount }] = await db
    .select({ count: count() })
    .from(roomsTable)
    .where(isNotNull(roomsTable.directions));

  // @ts-expect-error drizzle returns count as a scalar row here.
  const [{ count: totalRooms }] = await db
    .select({ count: count() })
    .from(roomsTable);

  return {
    rooms,
    buildings,
    colleges,
    divisions,
    dorms,
    events,
    classesMap,
    totalRooms,
    directionCount,
    activeTermId: defaultTerm?.id ?? null,
  };
}

export function getRoomSlug(room: Pick<RoomData, "code">) {
  return slugifySegment(room.code);
}

export { getRoomRouteSlug } from "./route-slugs";

export function getBuildingSlug(building: Pick<BuildingData, "buildingName">) {
  return slugifySegment(building.buildingName);
}

export function getDivisionSlug(division: Pick<DivisionData, "divisionName">) {
  return slugifySegment(division.divisionName);
}

export function getCollegeSlug(college: Pick<CollegeData, "collegeName">) {
  return slugifySegment(college.collegeName);
}

export function getDormSlug(dorm: Pick<DormData, "dormName">) {
  return slugifySegment(dorm.dormName);
}

export { getDormRouteSlug } from "./route-slugs";

export function getEventSlug(event: Pick<EventData, "slug">) {
  return event.slug;
}
