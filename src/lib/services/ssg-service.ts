import { and, count, eq } from "drizzle-orm";
import {
  buildingsTable,
  classesTable,
  collegesTable,
  divisionsTable,
  dormsTable,
  roomsTable,
} from "@drizzle/schema";
import {
  getBuildingSlug,
  getCollegeSlug,
  getDivisionSlug,
} from "@lib/app-data";
import { db } from "@lib/db";
import { getEventBySlug } from "./event-service";
import { getDefaultTerm } from "./term-service";

export async function resolveBuildingNameFromSlug(
  slug: string,
): Promise<string | null> {
  const rows = await db
    .select({ buildingName: buildingsTable.buildingName })
    .from(buildingsTable);
  return (
    rows.find((row) => getBuildingSlug(row) === slug)?.buildingName ?? null
  );
}

export async function resolveCollegeNameFromSlug(
  slug: string,
): Promise<string | null> {
  const rows = await db
    .select({ collegeName: collegesTable.collegeName })
    .from(collegesTable);
  return rows.find((row) => getCollegeSlug(row) === slug)?.collegeName ?? null;
}

export async function resolveDivisionNameFromSlug(
  slug: string,
): Promise<string | null> {
  const rows = await db
    .select({ divisionName: divisionsTable.divisionName })
    .from(divisionsTable);
  return (
    rows.find((row) => getDivisionSlug(row) === slug)?.divisionName ?? null
  );
}

export async function getBuildingPageData(buildingName: string) {
  const defaultTerm = await getDefaultTerm();

  const data = await db
    .select()
    .from(buildingsTable)
    .where(eq(buildingsTable.buildingName, buildingName))
    .leftJoin(roomsTable, eq(buildingsTable.id, roomsTable.buildingId));

  if (data.length === 0) return null;

  const building = data[0]?.buildings as typeof buildingsTable.$inferSelect;
  const roomCount = data.filter((row) => row.rooms?.id != null).length;

  let classCount = 0;
  if (defaultTerm) {
    const [{ count: classTotal }] = await db
      .select({ count: count() })
      .from(classesTable)
      .innerJoin(roomsTable, eq(classesTable.roomId, roomsTable.id))
      .where(
        and(
          eq(roomsTable.buildingId, building.id),
          eq(classesTable.termId, defaultTerm.id),
        ),
      );
    classCount = classTotal;
  }

  return {
    building,
    roomCount,
    classCount,
    termLabel: defaultTerm?.label ?? null,
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
  const defaultTerm = await getDefaultTerm();

  const [room] = await db
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
      imageUrl: roomsTable.imageUrl,
      version: roomsTable.version,
      updatedAt: roomsTable.updatedAt,
    })
    .from(roomsTable)
    .where(eq(roomsTable.id, roomId))
    .leftJoin(buildingsTable, eq(buildingsTable.id, roomsTable.buildingId))
    .leftJoin(collegesTable, eq(collegesTable.id, roomsTable.collegeId))
    .leftJoin(divisionsTable, eq(divisionsTable.id, roomsTable.divisionId))
    .limit(1);

  if (!room) return null;

  const [{ count: classCount }] = await db
    .select({ count: count() })
    .from(classesTable)
    .where(
      defaultTerm
        ? and(
            eq(classesTable.roomId, roomId),
            eq(classesTable.termId, defaultTerm.id),
          )
        : eq(classesTable.roomId, roomId),
    );

  return {
    room,
    classCount,
    termLabel: defaultTerm?.label ?? null,
  };
}

export async function getEventPageData(slug: string) {
  const event = await getEventBySlug(slug);
  if (!event || !event.includeInSeo) return null;
  return { event };
}
