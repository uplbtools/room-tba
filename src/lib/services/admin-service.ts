import { and, eq, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import {
  buildingsTable,
  collegesTable,
  divisionsTable,
  dormsTable,
  editorHistoryTable,
  roomsTable,
  roomPositionsTable,
  updateTable,
} from "../../../drizzle/schema";
import { db } from "../db";
import type { RoomData } from "../types";

// ── Sync key refresh ──

export class EditConflictError<TLatest> extends Error {
  latest: TLatest | null;

  constructor(latest: TLatest | null) {
    super("This record was changed by another editor.");
    this.name = "EditConflictError";
    this.latest = latest;
  }
}

/** Refresh the sync key for a table so viewers detect the change and re-sync. */
export async function refreshSyncKey(tableName: string): Promise<void> {
  await db
    .update(updateTable)
    .set({ syncKey: randomUUID() })
    .where(eq(updateTable.tableName, tableName));
}

type EditorHistoryInput = {
  entityType: string;
  entityId: number;
  action: string;
  before: unknown;
  after: unknown;
  versionBefore?: number | null;
  versionAfter?: number | null;
  editedBy?: string;
};

export async function recordEditorHistory({
  entityType,
  entityId,
  action,
  before,
  after,
  versionBefore,
  versionAfter,
  editedBy = "admin",
}: EditorHistoryInput): Promise<void> {
  await db.insert(editorHistoryTable).values({
    entityType,
    entityId,
    action,
    before,
    after,
    versionBefore,
    versionAfter,
    editedBy,
  });
}

// ── Rooms ──

export type RoomWithRelations = RoomData;

export async function getRoomById(id: number): Promise<RoomData | null> {
  const rows = await db
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
    .where(eq(roomsTable.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function getAllRoomsAdmin(): Promise<RoomWithRelations[]> {
  return db
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
    .orderBy(roomsTable.roomCode);
}

export type RoomUpdateInput = {
  roomCode?: string;
  directions?: string | null;
  buildingId?: number | null;
  collegeId?: number | null;
  divisionId?: number | null;
};

export async function updateRoom(
  id: number,
  input: RoomUpdateInput,
  expectedVersion?: number,
  editedBy = "admin",
): Promise<RoomData | null> {
  const updates: Record<string, unknown> = {};
  if (input.roomCode !== undefined) updates["roomCode"] = input.roomCode;
  if (input.directions !== undefined)
    updates["directions"] = input.directions || null;
  if (input.buildingId !== undefined)
    updates["buildingId"] = input.buildingId ?? null;
  if (input.collegeId !== undefined)
    updates["collegeId"] = input.collegeId ?? null;
  if (input.divisionId !== undefined)
    updates["divisionId"] = input.divisionId ?? null;

  if (Object.keys(updates).length > 0) {
    const before = await getRoomById(id);
    const where =
      expectedVersion === undefined
        ? eq(roomsTable.id, id)
        : and(eq(roomsTable.id, id), eq(roomsTable.version, expectedVersion));
    const [updated] = await db
      .update(roomsTable)
      .set({
        ...updates,
        version: sql`"version" + 1`,
        updatedAt: sql`now()`,
      })
      .where(where)
      .returning({ id: roomsTable.id });

    if (!updated && expectedVersion !== undefined) {
      throw new EditConflictError(await getRoomById(id));
    }

    const after = updated ? await getRoomById(id) : null;
    if (before && after) {
      await recordEditorHistory({
        entityType: "room",
        entityId: id,
        action: "update",
        before,
        after,
        versionBefore: before.version,
        versionAfter: after.version,
        editedBy,
      });
    }

    await refreshSyncKey("rooms");
    return after ?? (await getRoomById(id));
  }

  return getRoomById(id);
}

// ── Room positions ──

export type RoomPosition = {
  id: number;
  floor: number;
  posX: string;
  posY: string;
  updatedAt: string;
  roomId: number;
};

export async function getRoomPosition(
  roomId: number,
): Promise<RoomPosition | null> {
  const rows = await db
    .select()
    .from(roomPositionsTable)
    .where(eq(roomPositionsTable.roomId, roomId))
    .limit(1);
  return rows[0] ?? null;
}

export type RoomPositionUpdateInput = {
  floor: number;
  posX: string;
  posY: string;
};

export async function upsertRoomPosition(
  roomId: number,
  input: RoomPositionUpdateInput,
): Promise<void> {
  const existing = await getRoomPosition(roomId);
  const updatedAt = new Date().toISOString();
  if (existing) {
    await db
      .update(roomPositionsTable)
      .set({
        floor: input.floor,
        posX: input.posX,
        posY: input.posY,
        updatedAt,
      })
      .where(eq(roomPositionsTable.id, existing.id));
  } else {
    await db.insert(roomPositionsTable).values({
      floor: input.floor,
      posX: input.posX,
      posY: input.posY,
      updatedAt,
      roomId,
    });
  }
  await refreshSyncKey("rooms");
}

// ── Buildings ──

export type BuildingAdmin = typeof buildingsTable.$inferSelect;

export async function getBuildingById(
  id: number,
): Promise<BuildingAdmin | null> {
  const rows = await db
    .select()
    .from(buildingsTable)
    .where(eq(buildingsTable.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function getAllBuildingsAdmin(): Promise<BuildingAdmin[]> {
  return db.select().from(buildingsTable).orderBy(buildingsTable.buildingName);
}

export type BuildingUpdateInput = {
  buildingName?: string;
  lat?: number;
  lon?: number;
  buildingType?: "admin" | "non-admin";
  directions?: string;
};

export async function updateBuilding(
  id: number,
  input: BuildingUpdateInput,
  expectedVersion?: number,
  editedBy = "admin",
): Promise<BuildingAdmin | null> {
  const updates: Record<string, unknown> = {};
  if (input.buildingName !== undefined)
    updates["buildingName"] = input.buildingName;
  if (input.lat !== undefined) updates["lat"] = input.lat;
  if (input.lon !== undefined) updates["lon"] = input.lon;
  if (input.buildingType !== undefined)
    updates["buildingType"] = input.buildingType;
  if (input.directions !== undefined) updates["directions"] = input.directions;

  if (Object.keys(updates).length > 0) {
    const before = await getBuildingById(id);
    const where =
      expectedVersion === undefined
        ? eq(buildingsTable.id, id)
        : and(
            eq(buildingsTable.id, id),
            eq(buildingsTable.version, expectedVersion),
          );
    const [updated] = await db
      .update(buildingsTable)
      .set({
        ...updates,
        version: sql`"version" + 1`,
        updatedAt: sql`now()`,
      })
      .where(where)
      .returning();

    if (!updated && expectedVersion !== undefined) {
      throw new EditConflictError(await getBuildingById(id));
    }

    if (before && updated) {
      await recordEditorHistory({
        entityType: "building",
        entityId: id,
        action: "update",
        before,
        after: updated,
        versionBefore: before.version,
        versionAfter: updated.version,
        editedBy,
      });
    }

    await refreshSyncKey("buildings");
    return updated ?? (await getBuildingById(id));
  }

  return getBuildingById(id);
}

// ── Colleges ──

export type CollegeAdmin = typeof collegesTable.$inferSelect;

export async function getCollegeById(id: number): Promise<CollegeAdmin | null> {
  const rows = await db
    .select()
    .from(collegesTable)
    .where(eq(collegesTable.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function getAllCollegesAdmin(): Promise<CollegeAdmin[]> {
  return db.select().from(collegesTable).orderBy(collegesTable.collegeName);
}

export async function updateCollege(
  id: number,
  collegeName: string,
): Promise<void> {
  await db
    .update(collegesTable)
    .set({ collegeName })
    .where(eq(collegesTable.id, id));
  await refreshSyncKey("colleges");
}

// ── Divisions ──

export type DivisionAdmin = typeof divisionsTable.$inferSelect;

export async function getDivisionById(
  id: number,
): Promise<DivisionAdmin | null> {
  const rows = await db
    .select()
    .from(divisionsTable)
    .where(eq(divisionsTable.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function getAllDivisionsAdmin(): Promise<DivisionAdmin[]> {
  return db.select().from(divisionsTable).orderBy(divisionsTable.divisionName);
}

export async function updateDivision(
  id: number,
  divisionName: string,
): Promise<void> {
  await db
    .update(divisionsTable)
    .set({ divisionName })
    .where(eq(divisionsTable.id, id));
  await refreshSyncKey("divisions");
}

// ── Dorms ──

export type DormAdmin = typeof dormsTable.$inferSelect;

export async function getDormById(id: number): Promise<DormAdmin | null> {
  const rows = await db
    .select()
    .from(dormsTable)
    .where(eq(dormsTable.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function getAllDormsAdmin(): Promise<DormAdmin[]> {
  return db.select().from(dormsTable).orderBy(dormsTable.dormName);
}

export type DormUpdateInput = Partial<{
  dormName: string;
  shortName: string | null;
  lat: number | null;
  lon: number | null;
  gender: string;
  capacity: number | null;
  managingOffice: string | null;
  contactEmail: string | null;
  amenities: string[];
  osmLink: string | null;
  description: string | null;
  isUpManaged: boolean;
  priceRange: string | null;
  contactPhone: string[];
  facebookLink: string | null;
}>;

export async function updateDorm(
  id: number,
  input: DormUpdateInput,
  expectedVersion?: number,
  editedBy = "admin",
): Promise<DormAdmin | null> {
  const updates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) updates[key] = value;
  }
  if (Object.keys(updates).length > 0) {
    const before = await getDormById(id);
    const where =
      expectedVersion === undefined
        ? eq(dormsTable.id, id)
        : and(eq(dormsTable.id, id), eq(dormsTable.version, expectedVersion));
    const [updated] = await db
      .update(dormsTable)
      .set({
        ...updates,
        version: sql`"version" + 1`,
        updatedAt: sql`now()`,
      })
      .where(where)
      .returning();

    if (!updated && expectedVersion !== undefined) {
      throw new EditConflictError(await getDormById(id));
    }

    if (before && updated) {
      await recordEditorHistory({
        entityType: "dorm",
        entityId: id,
        action: "update",
        before,
        after: updated,
        versionBefore: before.version,
        versionAfter: updated.version,
        editedBy,
      });
    }

    await refreshSyncKey("dorms");
    return updated ?? (await getDormById(id));
  }

  return getDormById(id);
}

// ── Counts (for dashboard) ──

export async function getEntityCounts(): Promise<Record<string, number>> {
  const [rooms, buildings, colleges, divisions, dorms] = await Promise.all([
    db.select({ c: sql<number>`count(*)` }).from(roomsTable),
    db.select({ c: sql<number>`count(*)` }).from(buildingsTable),
    db.select({ c: sql<number>`count(*)` }).from(collegesTable),
    db.select({ c: sql<number>`count(*)` }).from(divisionsTable),
    db.select({ c: sql<number>`count(*)` }).from(dormsTable),
  ]);
  return {
    rooms: Number(rooms[0]?.c ?? 0),
    buildings: Number(buildings[0]?.c ?? 0),
    colleges: Number(colleges[0]?.c ?? 0),
    divisions: Number(divisions[0]?.c ?? 0),
    dorms: Number(dorms[0]?.c ?? 0),
  };
}
