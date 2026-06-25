import { eq, like, sql } from "drizzle-orm";
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
        buildingId: roomsTable.buildingId,
        collegeId: roomsTable.collegeId,
        divisionId: roomsTable.divisionId,
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

export async function getRoomByCode(code: string) {
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
        buildingId: roomsTable.buildingId,
        collegeId: roomsTable.collegeId,
        divisionId: roomsTable.divisionId,
      })
      .from(roomsTable)
      .leftJoin(buildingsTable, eq(buildingsTable.id, roomsTable.buildingId))
      .leftJoin(collegesTable, eq(collegesTable.id, roomsTable.collegeId))
      .leftJoin(divisionsTable, eq(divisionsTable.id, roomsTable.divisionId))
      .where(sql`upper(${roomsTable.roomCode}) = ${code}`);
    if (data.length === 0 || typeof data[0] === "undefined") return null;
    return data[0];
  } catch (e) {
    console.error("Error: ", e);
    throw new Error("Failed to fetch rooms");
  }
}

export async function searchRooms(searchString: string) {
  try {
    const data = await db
      .select({
        value: roomsTable.roomCode,
      })
      .from(roomsTable)
      .leftJoin(buildingsTable, eq(buildingsTable.id, roomsTable.buildingId))
      .leftJoin(collegesTable, eq(collegesTable.id, roomsTable.collegeId))
      .leftJoin(divisionsTable, eq(divisionsTable.id, roomsTable.divisionId))
      .where(like(roomsTable.roomCode, `%${searchString}%`)).limit(6);
    if (data.length === 0) return null;
    return data;
  } catch (e) {
    console.error("Error: ", e);
    throw new Error("Failed to fetch rooms");
  }
}

export async function getBuildingRooms(
  buildingId: number,
): Promise<RoomData[]> {
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
        buildingId: roomsTable.buildingId,
        collegeId: roomsTable.collegeId,
        divisionId: roomsTable.divisionId,
      })
      .from(roomsTable)
      .leftJoin(buildingsTable, eq(buildingsTable.id, roomsTable.buildingId))
      .leftJoin(collegesTable, eq(collegesTable.id, roomsTable.collegeId))
      .leftJoin(divisionsTable, eq(divisionsTable.id, roomsTable.divisionId))
      .where(eq(roomsTable.buildingId, buildingId));
    return data;
  } catch (e) {
    console.error("Error: ", e);
    throw new Error("Failed to fetch rooms");
  }
}
export async function getCollegeRooms(collegeId: number): Promise<RoomData[]> {
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
        buildingId: roomsTable.buildingId,
        collegeId: roomsTable.collegeId,
        divisionId: roomsTable.divisionId,
      })
      .from(roomsTable)
      .leftJoin(buildingsTable, eq(buildingsTable.id, roomsTable.buildingId))
      .leftJoin(collegesTable, eq(collegesTable.id, roomsTable.collegeId))
      .leftJoin(divisionsTable, eq(divisionsTable.id, roomsTable.divisionId))
      .where(eq(roomsTable.collegeId, collegeId));
    return data;
  } catch (e) {
    console.error("Error: ", e);
    throw new Error("Failed to fetch rooms");
  }
}
export async function getDivisionRooms(
  divisionId: number,
): Promise<RoomData[]> {
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
        buildingId: roomsTable.buildingId,
        collegeId: roomsTable.collegeId,
        divisionId: roomsTable.divisionId,
      })
      .from(roomsTable)
      .leftJoin(buildingsTable, eq(buildingsTable.id, roomsTable.buildingId))
      .leftJoin(collegesTable, eq(collegesTable.id, roomsTable.collegeId))
      .leftJoin(divisionsTable, eq(divisionsTable.id, roomsTable.divisionId))
      .where(eq(roomsTable.divisionId, divisionId));

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
        id: classesTable.id,
        termId: classesTable.termId,
        roomId: classesTable.roomId,
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
    throw new Error("Failed to fetch data for dorms");
  }
}
