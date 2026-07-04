import { and, asc, count, eq, ilike, like, or, sql } from "drizzle-orm";
import {
  aliasesTable,
  buildingsTable,
  classesTable,
  collegesTable,
  divisionsTable,
  dormsTable,
  finalExamsTable,
  roomsTable,
} from "@drizzle/schema";
import { clampLimitValue } from "@lib/api/pagination";
import { db } from "@lib/db";
import { normalizeCourseCode } from "@lib/final-exams/normalize";
import { normalizeAlias } from "@lib/site";
import { normalizeDormListFields } from "@lib/string-lists";
import { getBuildCache } from "./ssg-cache";
import type {
  BuildingData,
  ClassMapValue,
  CollegeData,
  DivisionData,
  DormData,
  FinalExamRow,
  RoomData,
} from "@lib/types";

// Cached getters for SSG (#331)
export async function getAllBuildingsCached(): Promise<BuildingData[]> {
  const cache = getBuildCache();
  if (cache.buildings) return cache.buildings;
  const data = await db.select().from(buildingsTable);
  cache.buildings = data;
  return data;
}

export async function getAllRoomsCached(): Promise<RoomData[]> {
  const cache = getBuildCache();
  if (cache.rooms) return cache.rooms;
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
  cache.rooms = data;
  return data;
}

export async function getAllCollegesCached(): Promise<CollegeData[]> {
  const cache = getBuildCache();
  if (cache.colleges) return cache.colleges;
  const data = await db.select().from(collegesTable);
  cache.colleges = data;
  return data;
}

export async function getAllDivisionsCached(): Promise<DivisionData[]> {
  const cache = getBuildCache();
  if (cache.divisions) return cache.divisions;
  const data = await db.select().from(divisionsTable);
  cache.divisions = data;
  return data;
}

export async function getAllDormsCached(): Promise<DormData[]> {
  const cache = getBuildCache();
  if (cache.dorms) return cache.dorms;
  const data = await db.select().from(dormsTable);
  cache.dorms = data;
  return data;
}

// Legacy non-cached versions for runtime use
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

const classListSelect = {
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
};

function classListWhere(termId?: number, courseCodePrefix?: string) {
  const filters = [];
  if (termId != null) {
    filters.push(eq(classesTable.termId, termId));
  }
  const prefix = courseCodePrefix?.trim();
  if (prefix) {
    filters.push(ilike(classesTable.courseCode, `${prefix.toUpperCase()}%`));
  }
  return filters.length > 0 ? and(...filters) : undefined;
}

export type ClassQueryPage = {
  rows: ClassMapValue[];
  total: number;
};

export async function queryClasses(options: {
  termId?: number;
  courseCodePrefix?: string;
  limit?: number;
  offset?: number;
}): Promise<ClassQueryPage> {
  try {
    const limit = clampLimitValue(options.limit, {
      defaultValue: 50,
      max: 100,
    });
    const offset = Math.max(options.offset ?? 0, 0);
    const where = classListWhere(options.termId, options.courseCodePrefix);

    const [{ value: total }] = await db
      .select({ value: count() })
      .from(classesTable)
      .leftJoin(roomsTable, eq(roomsTable.id, classesTable.roomId))
      .where(where);

    const rows = await db
      .select(classListSelect)
      .from(classesTable)
      .leftJoin(roomsTable, eq(roomsTable.id, classesTable.roomId))
      .where(where)
      .orderBy(asc(classesTable.courseCode), asc(classesTable.section))
      .limit(limit)
      .offset(offset);

    return { rows, total: Number(total ?? 0) };
  } catch (e) {
    console.error("Error: ", e);
    throw new Error("Failed to query classes", { cause: e });
  }
}

export async function getAllClasses(termId?: number): Promise<ClassMapValue[]> {
  try {
    const data = await db
      .select(classListSelect)
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
    const inRoom = await db
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

    if (inRoom.length === 0) return inRoom;

    const pairKeys = [
      ...new Map(
        inRoom
          .filter((row) => row.courseCode && row.section)
          .map((row) => [
            `${row.courseCode}::${row.section}`,
            { courseCode: row.courseCode!, section: row.section! },
          ]),
      ).values(),
    ];

    if (pairKeys.length === 0) return inRoom;

    const offeringRows = await db
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
          termId != null ? eq(classesTable.termId, termId) : undefined,
          or(
            ...pairKeys.map((pair) =>
              and(
                eq(classesTable.courseCode, pair.courseCode),
                eq(classesTable.section, pair.section),
              ),
            ),
          ),
        ),
      );

    const byId = new Map<number, ClassMapValue>();
    for (const row of [...inRoom, ...offeringRows]) {
      byId.set(row.id, row);
    }

    return [...byId.values()].sort((a, b) => {
      const code = (a.courseCode ?? "").localeCompare(b.courseCode ?? "");
      if (code !== 0) return code;
      return (a.section ?? "").localeCompare(b.section ?? "");
    });
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

export async function queryFinalExams(filters: {
  courseCode?: string;
  roomCode?: string;
  date?: string;
  termId?: number;
}): Promise<FinalExamRow[]> {
  try {
    const conditions = [];
    if (filters.termId != null) {
      conditions.push(eq(finalExamsTable.termId, filters.termId));
    }
    if (filters.courseCode) {
      const code = normalizeCourseCode(filters.courseCode);
      if (code) conditions.push(eq(finalExamsTable.courseCode, code));
    }
    if (filters.roomCode) {
      conditions.push(eq(roomsTable.roomCode, filters.roomCode));
    }
    if (filters.date) {
      conditions.push(eq(finalExamsTable.examDate, filters.date));
    }

    const data = await db
      .select({
        id: finalExamsTable.id,
        termId: finalExamsTable.termId,
        courseCode: finalExamsTable.courseCode,
        section: finalExamsTable.section,
        courseTitle: finalExamsTable.courseTitle,
        roomId: finalExamsTable.roomId,
        roomCode: roomsTable.roomCode,
        examDate: finalExamsTable.examDate,
        startsAt: finalExamsTable.startsAt,
        endsAt: finalExamsTable.endsAt,
        source: finalExamsTable.source,
      })
      .from(finalExamsTable)
      .leftJoin(roomsTable, eq(roomsTable.id, finalExamsTable.roomId))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(
        finalExamsTable.examDate,
        finalExamsTable.startsAt,
        finalExamsTable.courseCode,
      );

    return data;
  } catch (e) {
    console.error("Error: ", e);
    throw new Error("Failed to fetch final exams", { cause: e });
  }
}
