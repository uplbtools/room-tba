// src/lib/app-data.ts

import { count, eq, isNotNull } from "drizzle-orm";
import {
  buildingsTable,
  classesTable,
  collegesTable,
  divisionsTable,
  dormsTable,
  roomsTable,
} from "../../drizzle/schema";
import { db } from "./db";
import { slugifySegment } from "./site";
import { BuildingData, ClassMapValue, CollegeData, DivisionData, DormData, RoomData } from "./types";

export type SearchCategory =
  | "building"
  | "division"
  | "college"
  | "room"
  | "dorm";

export type InitialSearchState = {
  category: SearchCategory;
  value: string;
};

export type AppPageData = {
  rooms: RoomData[];
  buildings: BuildingData[];
  colleges: CollegeData[];
  divisions: DivisionData[];
  dorms: DormData[];
  classesMap: Map<string, ClassMapValue[]>;
  totalRooms: number;
  directionCount: number;
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
    .leftJoin(roomsTable, eq(roomsTable.id, classesTable.roomId));

  const buildings = await db.select().from(buildingsTable);
  const colleges = await db.select().from(collegesTable);
  const divisions = await db.select().from(divisionsTable);
  const dorms = await db.select().from(dormsTable);

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

  // @ts-ignore drizzle returns count as a scalar row here.
  const [{ count: directionCount }] = await db
    .select({ count: count() })
    .from(roomsTable)
    .where(isNotNull(roomsTable.directions));

  // @ts-ignore drizzle returns count as a scalar row here.
  const [{ count: totalRooms }] = await db
    .select({ count: count() })
    .from(roomsTable);

  return {
    rooms,
    buildings,
    colleges,
    divisions,
    dorms,
    classesMap,
    totalRooms,
    directionCount,
  };
}

export function getRoomSlug(room: Pick<RoomData, "code">) {
  return slugifySegment(room.code);
}

export function getRoomRouteSlug(
  room: Pick<RoomData, "id" | "code">,
) {
  const baseSlug = getRoomSlug(room);

  return `${baseSlug}-${room.id}`;
}

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

export function getDormRouteSlug(
  dorm: Pick<DormData, "id" | "dormName">,
) {
  const baseSlug = getDormSlug(dorm);

  return `${baseSlug}-${dorm.id}`;
}
