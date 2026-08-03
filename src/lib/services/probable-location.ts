/**
 * Attach `probableLocation` to unassigned class sections (#846). Batched per
 * response page: one classes lookup for acad codes, one organizations read,
 * and at most two grouped history aggregates. Degrades to "no hint" on any
 * failure so /api/classes keeps working before drizzle/0042 is applied.
 * ponytail: no cache — hints ride the existing per-request query budget; add
 * one if TBA-heavy pages show up hot in logs.
 */
import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";
import {
  buildingsTable,
  classesTable,
  organizationsTable,
  roomsTable,
} from "@drizzle/schema";
import { isRoomScheduledClassType } from "@lib/amis/room-scheduled-types";
import { db } from "@lib/db";
import {
  type HistoryRow,
  type ProbableLocation,
  rankBuildingsByHistory,
  resolveProbableLocation,
} from "@lib/probable-location";
import type { ClassMapValue } from "@lib/types";

const historySelect = {
  buildingId: buildingsTable.id,
  buildingName: buildingsTable.buildingName,
  termId: classesTable.termId,
  sections: sql<number>`count(*)::int`,
};

function toHistoryRows(
  rows: Array<{
    key: string | null;
    buildingId: number;
    buildingName: string;
    termId: number | null;
    sections: number;
  }>,
): Map<string, HistoryRow[]> {
  const byKey = new Map<string, HistoryRow[]>();
  for (const row of rows) {
    if (row.key == null || row.termId == null) continue;
    const list = byKey.get(row.key) ?? [];
    list.push({
      buildingId: row.buildingId,
      buildingName: row.buildingName,
      termId: row.termId,
      sections: row.sections,
    });
    byKey.set(row.key, list);
  }
  return byKey;
}

async function courseHistoryByCode(codes: string[]) {
  if (codes.length === 0) return new Map<string, HistoryRow[]>();
  const rows = await db
    .select({ key: classesTable.courseCode, ...historySelect })
    .from(classesTable)
    .innerJoin(roomsTable, eq(roomsTable.id, classesTable.roomId))
    .innerJoin(buildingsTable, eq(buildingsTable.id, roomsTable.buildingId))
    .where(
      and(
        inArray(classesTable.courseCode, codes),
        isNotNull(classesTable.termId),
      ),
    )
    .groupBy(
      classesTable.courseCode,
      buildingsTable.id,
      buildingsTable.buildingName,
      classesTable.termId,
    );
  return toHistoryRows(rows);
}

async function deptHistoryByOrg(orgCodes: string[]) {
  if (orgCodes.length === 0) return new Map<string, HistoryRow[]>();
  const rows = await db
    .select({ key: classesTable.acadOrg, ...historySelect })
    .from(classesTable)
    .innerJoin(roomsTable, eq(roomsTable.id, classesTable.roomId))
    .innerJoin(buildingsTable, eq(buildingsTable.id, roomsTable.buildingId))
    .where(
      and(
        inArray(classesTable.acadOrg, orgCodes),
        isNotNull(classesTable.termId),
      ),
    )
    .groupBy(
      classesTable.acadOrg,
      buildingsTable.id,
      buildingsTable.buildingName,
      classesTable.termId,
    );
  return toHistoryRows(rows);
}

/**
 * Mutates `rows`, setting `probableLocation` on unassigned room-scheduled
 * sections (LEC/LAB/RCT/CPT). Thesis-style sections are roomless by design
 * and get no hint. Assigned sections are never touched.
 */
export async function attachProbableLocations(
  rows: ClassMapValue[],
): Promise<void> {
  const candidates = rows.filter(
    (row) =>
      row.roomId == null &&
      row.roomCode == null &&
      isRoomScheduledClassType(row.type),
  );
  if (candidates.length === 0) return;

  try {
    // Separate query so a missing acad_group/acad_org column (migration not
    // yet applied) only disables hints instead of breaking the class list.
    const acadRows = await db
      .select({
        id: classesTable.id,
        acadGroup: classesTable.acadGroup,
        acadOrg: classesTable.acadOrg,
      })
      .from(classesTable)
      .where(
        inArray(
          classesTable.id,
          candidates.map((row) => row.id),
        ),
      );
    const acadById = new Map(acadRows.map((row) => [row.id, row]));

    const orgs = await db
      .select({
        name: organizationsTable.name,
        lat: organizationsTable.lat,
        lon: organizationsTable.lon,
        buildingId: organizationsTable.buildingId,
      })
      .from(organizationsTable);

    // First pass: department pin only (empty histories). Collect what is
    // still unresolved so history aggregates run once, batched.
    const unresolved: ClassMapValue[] = [];
    for (const row of candidates) {
      const acad = acadById.get(row.id);
      const location = resolveProbableLocation({
        acadOrg: acad?.acadOrg ?? null,
        acadGroup: acad?.acadGroup ?? null,
        orgs,
        courseHistory: [],
        deptHistory: [],
      });
      if (location?.orgName) {
        row.probableLocation = location;
      } else {
        unresolved.push(row);
      }
    }
    if (unresolved.length === 0) return;

    const courseHistory = await courseHistoryByCode([
      ...new Set(
        unresolved
          .map((row) => row.courseCode)
          .filter((code): code is string => !!code),
      ),
    ]);
    const stillUnresolved = unresolved.filter((row) => {
      const ranked = rankBuildingsByHistory(
        row.courseCode ? (courseHistory.get(row.courseCode) ?? []) : [],
      );
      return !ranked;
    });
    const deptHistory = await deptHistoryByOrg([
      ...new Set(
        stillUnresolved
          .map((row) => acadById.get(row.id)?.acadOrg)
          .filter((code): code is string => !!code),
      ),
    ]);

    for (const row of unresolved) {
      const acad = acadById.get(row.id);
      const location = resolveProbableLocation({
        acadOrg: acad?.acadOrg ?? null,
        acadGroup: acad?.acadGroup ?? null,
        orgs,
        courseHistory: row.courseCode
          ? (courseHistory.get(row.courseCode) ?? [])
          : [],
        deptHistory: acad?.acadOrg ? (deptHistory.get(acad.acadOrg) ?? []) : [],
      });
      if (location) row.probableLocation = location;
    }
  } catch (e) {
    console.error("probable-location: skipping hints", e);
  }
}

export type { ProbableLocation };
