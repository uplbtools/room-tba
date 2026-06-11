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
      code: roomsTable.room_code,
      directions: roomsTable.directions,
      building: {
        name: buildingsTable.building_name,
        lat: buildingsTable.lat,
        lon: buildingsTable.lon,
        directions: buildingsTable.directions,
      },
      collegeName: collegesTable.college_name,
      divisionName: divisionsTable.division_name,
    })
    .from(roomsTable)
    .leftJoin(buildingsTable, eq(buildingsTable.id, roomsTable.building_id))
    .leftJoin(divisionsTable, eq(divisionsTable.id, roomsTable.division_id))
    .leftJoin(collegesTable, eq(collegesTable.id, roomsTable.college_id));

  const classes = await db
    .select({
      courseCode: classesTable.course_code,
      roomCode: roomsTable.room_code,
      section: classesTable.section,
      type: classesTable.type,
      schedule: classesTable.schedule,
      directions: roomsTable.directions,
      courseTitle: classesTable.course_title,
    })
    .from(classesTable)
    .where(eq(classesTable.term_id, 1253))
    .leftJoin(roomsTable, eq(roomsTable.id, classesTable.room_id))

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
  rooms: Array<Pick<RoomData, "id" | "code">>,
) {
  const baseSlug = getRoomSlug(room);
  const hasCollision =
    rooms.filter((item) => getRoomSlug(item) === baseSlug).length > 1;

  return hasCollision ? `${baseSlug}-${room.id}` : baseSlug;
}

export function getBuildingSlug(building: Pick<BuildingData, "building_name">) {
  return slugifySegment(building.building_name);
}

export function getDivisionSlug(division: Pick<DivisionData, "division_name">) {
  return slugifySegment(division.division_name);
}

export function getCollegeSlug(college: Pick<CollegeData, "college_name">) {
  return slugifySegment(college.college_name);
}

export function getDormSlug(dorm: Pick<DormData, "dorm_name">) {
  return slugifySegment(dorm.dorm_name);
}

export function getDormRouteSlug(
  dorm: Pick<DormData, "id" | "dorm_name">,
  dorms: Array<Pick<DormData, "id" | "dorm_name">>,
) {
  const baseSlug = getDormSlug(dorm);
  const hasCollision =
    dorms.filter((item) => getDormSlug(item) === baseSlug).length > 1;

  return hasCollision ? `${baseSlug}-${dorm.id}` : baseSlug;
}
