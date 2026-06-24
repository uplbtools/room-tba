import { eq, getTableColumns } from "drizzle-orm";
import {
  buildingsTable,
  classesTable,
  collegesTable,
  divisionsTable,
  dormsTable,
  roomsTable,
} from "../../../drizzle/schema";
import { db } from "../db";

export async function getBuildingPageData(buildingName: string) {
  const data = await db
    .select()
    .from(buildingsTable)
    .where(eq(buildingsTable.buildingName, buildingName))
    .leftJoin(roomsTable, eq(buildingsTable.id, roomsTable.buildingId));

  if (data.length === 0) return null;

  return {
    building: data[0]?.buildings as typeof buildingsTable.$inferSelect,
    roomCount: data.length,
  };
}

export async function getCollegePageData(collegeName: string) {
  const data = await db
    .select()
    .from(collegesTable)
    .where(eq(collegesTable.collegeName, collegeName))
    .leftJoin(roomsTable, eq(collegesTable.id, roomsTable.collegeId));

  if (data.length === 0) return null;

  return {
    college: data[0]?.colleges as typeof collegesTable.$inferSelect,
    roomCount: data.length,
  };
}

export async function getDivisionPageData(divisionName: string) {
  const data = await db
    .select()
    .from(divisionsTable)
    .where(eq(divisionsTable.divisionName, divisionName))
    .leftJoin(roomsTable, eq(divisionsTable.id, roomsTable.divisionId));

  if (data.length === 0) return null;

  return {
    division: data[0]?.divisions as typeof divisionsTable.$inferSelect,
    roomCount: data.length,
  };
}

export async function getDormPageData(dormId: number) {
  const data = await db
    .select()
    .from(dormsTable)
    .where(eq(dormsTable.id, dormId));

  if (data.length === 0 || !data[0]) return null;
  return { dorm: data[0] };
}

export async function getRoomPageData(roomId: number) {
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
      class: getTableColumns(classesTable)
    })
    .from(roomsTable)
    .where(eq(roomsTable.id, roomId))
    .leftJoin(buildingsTable, eq(buildingsTable.id, roomsTable.buildingId))
    .leftJoin(collegesTable, eq(collegesTable.id, roomsTable.collegeId))
    .leftJoin(divisionsTable, eq(divisionsTable.id, roomsTable.divisionId))
    .leftJoin(classesTable, eq(classesTable.roomId, roomId));


  if (data.length === 0 || !data[0]) return null;
  return { room: data[0], classCount: data.length };
}
