import { and, eq, like, or, sql } from "drizzle-orm";
import {
  aliasesTable,
  buildingsTable,
  classesTable,
  collegesTable,
  divisionsTable,
  dormsTable,
  roomsTable,
} from "@drizzle/schema";
import { db } from "@lib/db";
import { normalizeAlias } from "@lib/site";
import { normalizeDormListFields } from "@lib/string-lists";
import type {
  BuildingData,
  ClassMapValue,
  CollegeData,
  DivisionData,
  DormData,
  RoomData,
} from "@lib/types";

export async function getAllBuildings(): Promise<BuildingData[]> {
  try {
    const data = await db.select().from(buildingsTable);
    return data;
  } catch (e) {
    console.error(e);
    throw new Error("Failed to fetch data for buildings", { cause: e });
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
        version: roomsTable.version,
        updatedAt: roomsTable.updatedAt,
      })
      .from(roomsTable)
      .leftJoin(buildingsTable, eq(buildingsTable.id, roomsTable.buildingId))
      .leftJoin(collegesTable, eq(collegesTable.id, roomsTable.collegeId))
      .leftJoin(divisionsTable, eq(divisionsTable.id, roomsTable.divisionId));
    return data;
  } catch (e) {
    console.error("Error: ", e);
    throw new Error("Failed to fetch rooms", { cause: e });
  }
}

export async function getRoomByCode(code: string) {
  try {
    const normalizedCode = code.toUpperCase();
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
        version: roomsTable.version,
        updatedAt: roomsTable.updatedAt,
      })
      .from(roomsTable)
      .leftJoin(buildingsTable, eq(buildingsTable.id, roomsTable.buildingId))
      .leftJoin(collegesTable, eq(collegesTable.id, roomsTable.collegeId))
      .leftJoin(divisionsTable, eq(divisionsTable.id, roomsTable.divisionId))
      .where(sql`upper(${roomsTable.roomCode}) = ${normalizedCode}`);
    if (data.length === 0 || typeof data[0] === "undefined") return null;
    return data[0];
  } catch (e) {
    console.error("Error: ", e);
    throw new Error("Failed to fetch rooms", { cause: e });
  }
}

export async function searchRooms(searchString: string) {
  try {
    const escaped = searchString.replace(/%/g, "\\%").replace(/_/g, "\\_");
    const data = await db
      .select({
        value: roomsTable.roomCode,
      })
      .from(roomsTable)
      .leftJoin(buildingsTable, eq(buildingsTable.id, roomsTable.buildingId))
      .leftJoin(collegesTable, eq(collegesTable.id, roomsTable.collegeId))
      .leftJoin(divisionsTable, eq(divisionsTable.id, roomsTable.divisionId))
      .where(like(roomsTable.roomCode, `%${escaped}%`))
      .limit(6);
    if (data.length === 0) return null;
    return data;
  } catch (e) {
    console.error("Error: ", e);
    throw new Error("Failed to fetch rooms", { cause: e });
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
        version: roomsTable.version,
        updatedAt: roomsTable.updatedAt,
      })
      .from(roomsTable)
      .leftJoin(buildingsTable, eq(buildingsTable.id, roomsTable.buildingId))
      .leftJoin(collegesTable, eq(collegesTable.id, roomsTable.collegeId))
      .leftJoin(divisionsTable, eq(divisionsTable.id, roomsTable.divisionId))
      .where(eq(roomsTable.buildingId, buildingId));
    return data;
  } catch (e) {
    console.error("Error: ", e);
    throw new Error("Failed to fetch rooms", { cause: e });
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
        version: roomsTable.version,
        updatedAt: roomsTable.updatedAt,
      })
      .from(roomsTable)
      .leftJoin(buildingsTable, eq(buildingsTable.id, roomsTable.buildingId))
      .leftJoin(collegesTable, eq(collegesTable.id, roomsTable.collegeId))
      .leftJoin(divisionsTable, eq(divisionsTable.id, roomsTable.divisionId))
      .where(eq(roomsTable.collegeId, collegeId));
    return data;
  } catch (e) {
    console.error("Error: ", e);
    throw new Error("Failed to fetch rooms", { cause: e });
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
        version: roomsTable.version,
        updatedAt: roomsTable.updatedAt,
      })
      .from(roomsTable)
      .leftJoin(buildingsTable, eq(buildingsTable.id, roomsTable.buildingId))
      .leftJoin(collegesTable, eq(collegesTable.id, roomsTable.collegeId))
      .leftJoin(divisionsTable, eq(divisionsTable.id, roomsTable.divisionId))
      .where(eq(roomsTable.divisionId, divisionId));

    return data;
  } catch (e) {
    console.error("Error: ", e);
    throw new Error("Failed to fetch rooms", { cause: e });
  }
}

export async function getAllColleges(): Promise<CollegeData[]> {
  try {
    const data = await db.select().from(collegesTable);
    return data;
  } catch (e) {
    console.error("Error: ", e);
    throw new Error("Failed to fetch data for colleges", { cause: e });
  }
}

export async function getAllDivisions(): Promise<DivisionData[]> {
  try {
    const data = await db.select().from(divisionsTable);
    return data;
  } catch (e) {
    console.error("Error: ", e);
    throw new Error("Failed to fetch data for divisions", { cause: e });
  }
}

export async function getAllClasses(termId?: number): Promise<ClassMapValue[]> {
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
      .leftJoin(roomsTable, eq(roomsTable.id, classesTable.roomId))
      .where(termId != null ? eq(classesTable.termId, termId) : undefined);
    return data;
  } catch (e) {
    console.error("Error: ", e);
    throw new Error("Failed to fetch data for classes", { cause: e });
  }
}

export async function getClassesForRoom(
  roomCode: string,
  termId?: number,
): Promise<ClassMapValue[]> {
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
      .leftJoin(roomsTable, eq(roomsTable.id, classesTable.roomId))
      .where(
        and(
          eq(roomsTable.roomCode, roomCode),
          termId != null ? eq(classesTable.termId, termId) : undefined,
        ),
      );
    return data;
  } catch (e) {
    console.error("Error: ", e);
    throw new Error("Failed to fetch classes for room", { cause: e });
  }
}

/** Per-room class counts for one building/college/division, optionally scoped
 * to a term. Returns a Map of roomId -> count; rooms with no classes for the
 * scope are included with count 0 (LEFT JOIN + GROUP BY). One grouped query
 * feeds the room list preview so we avoid N+1 /api/classes calls per row
 * (#342). */
export async function getRoomClassCounts(
  entityName: "building" | "college" | "division",
  id: number,
  termId?: number,
): Promise<Map<number, number>> {
  try {
    const column =
      entityName === "building"
        ? roomsTable.buildingId
        : entityName === "college"
          ? roomsTable.collegeId
          : roomsTable.divisionId;
    const data = await db
      .select({
        roomId: roomsTable.id,
        count: sql<number>`count(${classesTable.id})::int`,
      })
      .from(roomsTable)
      .leftJoin(
        classesTable,
        and(
          eq(classesTable.roomId, roomsTable.id),
          termId != null ? eq(classesTable.termId, termId) : undefined,
        ),
      )
      .where(eq(column, id))
      .groupBy(roomsTable.id);
    return new Map(data.map((row) => [row.roomId, row.count]));
  } catch (e) {
    console.error("Error: ", e);
    throw new Error("Failed to fetch room class counts", { cause: e });
  }
}

export type AliasMatch = {
  alias: string;
  targetType: string;
  targetId: number;
  value: string | null;
};

export type AliasCacheRow = AliasMatch & {
  id: number;
  normalizedAlias: string;
};

/** All alias rows with resolved building names for PGlite cache refresh (#155). */
export async function listAliasesForCache(): Promise<AliasCacheRow[]> {
  try {
    const rows = await db
      .select({
        id: aliasesTable.id,
        alias: aliasesTable.alias,
        normalizedAlias: aliasesTable.normalizedAlias,
        targetType: aliasesTable.targetType,
        targetId: aliasesTable.targetId,
        buildingName: buildingsTable.buildingName,
      })
      .from(aliasesTable)
      .leftJoin(
        buildingsTable,
        and(
          eq(aliasesTable.targetType, "building"),
          eq(buildingsTable.id, aliasesTable.targetId),
        ),
      );

    return rows.map((row) => ({
      id: row.id,
      alias: row.alias,
      normalizedAlias: row.normalizedAlias,
      targetType: row.targetType,
      targetId: row.targetId,
      value: row.buildingName,
    }));
  } catch (e) {
    console.error("Error: ", e);
    return [];
  }
}

/** Resolve a search term against the alias/synonym map (#155). Matches exact
 * and prefix normalized aliases, returning the (deduped) building targets. */
export async function searchAliases(
  searchString: string,
): Promise<AliasMatch[]> {
  try {
    const normalized = normalizeAlias(searchString);
    if (!normalized) return [];
    const rows = await db
      .select({
        alias: aliasesTable.alias,
        normalizedAlias: aliasesTable.normalizedAlias,
        targetType: aliasesTable.targetType,
        targetId: aliasesTable.targetId,
        buildingName: buildingsTable.buildingName,
      })
      .from(aliasesTable)
      .leftJoin(
        buildingsTable,
        and(
          eq(aliasesTable.targetType, "building"),
          eq(buildingsTable.id, aliasesTable.targetId),
        ),
      )
      .where(
        or(
          eq(aliasesTable.normalizedAlias, normalized),
          like(aliasesTable.normalizedAlias, `${normalized}%`),
        ),
      )
      .limit(12);

    // Exact matches first, then dedupe by target.
    rows.sort((a, b) => {
      const ae = a.normalizedAlias === normalized ? 0 : 1;
      const be = b.normalizedAlias === normalized ? 0 : 1;
      return ae - be;
    });
    const seen = new Set<string>();
    const matches: AliasMatch[] = [];
    for (const row of rows) {
      const key = `${row.targetType}:${row.targetId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      matches.push({
        alias: row.alias,
        targetType: row.targetType,
        targetId: row.targetId,
        value: row.buildingName,
      });
    }
    return matches;
  } catch (e) {
    console.error("Error: ", e);
    return [];
  }
}

export async function getAllDorms(): Promise<DormData[]> {
  try {
    const data = await db.select().from(dormsTable);
    return data.map(normalizeDormListFields);
  } catch (e) {
    console.error("Error: ", e);
    throw new Error("Failed to fetch data for dorms", { cause: e });
  }
}
