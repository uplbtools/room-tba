import { eq } from "drizzle-orm";
import {
  buildingsTable,
  classesTable,
  collegesTable,
  divisionsTable,
  dormsTable,
  roomsTable,
} from "../../../drizzle/schema";
import { db } from "../db";
import {
  BuildingData,
  ClassMapValue,
  CollegeData,
  DivisionData,
  DormData,
  RoomData,
} from "../types";

export async function getAllBuildings(): Promise<BuildingData[]> {
  try {
    const data = await db.select().from(buildingsTable);
    return data;
  } catch (e) {
    console.error(e);
    throw new Error("Failed to fetch data for buildings");
  }
}

export async function getAllRooms(): Promise<RoomData[]> {
  try {
    const data = await db
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
      .leftJoin(collegesTable, eq(collegesTable.id, roomsTable.collegeId))
      .leftJoin(divisionsTable, eq(divisionsTable.id, roomsTable.divisionId));
    return data;
  } catch (e) {
    console.error("Error: ", e);
    throw new Error("Failed to fetch rooms");
  }
}

export async function getAllColleges(): Promise<CollegeData[]> {
  try {
    const data = await db.select().from(collegesTable);
    return data;
  } catch (e) {
    console.error("Error: ", e);
    throw new Error("Failed to fetch data for colleges");
  }
}

export async function getAllDivisions(): Promise<DivisionData[]> {
  try {
    const data = await db.select().from(divisionsTable);
    return data;
  } catch (e) {
    console.error("Error: ", e);
    throw new Error("Failed to fetch data for divisions");
  }
}

export async function getAllClasses(): Promise<ClassMapValue[]> {
  try {
    const data = await db
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
    return data;
  } catch (e) {
    console.error("Error: ", e);
    throw new Error("Failed to fetch data for classes");
  }
}

export async function getAllDorms(): Promise<DormData[]> {
  try {
    const data = await db.select().from(dormsTable);
    return data;
  } catch (e) {
    console.error("Error: ", e);
    throw new Error("Failed to fetch data for dorms")
  }
}
