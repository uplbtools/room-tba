import { eq, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import {
  buildingsTable,
  collegesTable,
  divisionsTable,
  dormsTable,
  roomsTable,
  roomPositionsTable,
  updateTable,
} from "../../../drizzle/schema";
import { db } from "../db";

// ── Sync key refresh ──

/** Refresh the sync key for a table so viewers detect the change and re-sync. */
export async function refreshSyncKey(tableName: string): Promise<void> {
  await db
    .update(updateTable)
    .set({ syncKey: randomUUID() })
    .where(eq(updateTable.tableName, tableName));
}

// ── Rooms ──

export type RoomWithRelations = {
  id: number;
  roomCode: string;
  directions: string | null;
  buildingId: number | null;
  collegeId: number | null;
  divisionId: number | null;
};

export async function getRoomById(id: number): Promise<RoomWithRelations | null> {
  const rows = await db
    .select({
      id: roomsTable.id,
      roomCode: roomsTable.roomCode,
      directions: roomsTable.directions,
      buildingId: roomsTable.buildingId,
      collegeId: roomsTable.collegeId,
      divisionId: roomsTable.divisionId,
    })
    .from(roomsTable)
    .where(eq(roomsTable.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function getAllRoomsAdmin(): Promise<RoomWithRelations[]> {
  return db
    .select({
      id: roomsTable.id,
      roomCode: roomsTable.roomCode,
      directions: roomsTable.directions,
      buildingId: roomsTable.buildingId,
      collegeId: roomsTable.collegeId,
      divisionId: roomsTable.divisionId,
    })
    .from(roomsTable)
    .orderBy(roomsTable.roomCode);
}

export type RoomUpdateInput = {
  roomCode?: string;
  directions?: string | null;
  buildingId?: number | null;
  collegeId?: number | null;
  divisionId?: number | null;
};

export async function updateRoom(id: number, input: RoomUpdateInput): Promise<void> {
  const updates: Record<string, unknown> = {};
  if (input.roomCode !== undefined) updates["roomCode"] = input.roomCode;
  if (input.directions !== undefined) updates["directions"] = input.directions || null;
  if (input.buildingId !== undefined) updates["buildingId"] = input.buildingId || null;
  if (input.collegeId !== undefined) updates["collegeId"] = input.collegeId || null;
  if (input.divisionId !== undefined) updates["divisionId"] = input.divisionId || null;

  if (Object.keys(updates).length > 0) {
    await db.update(roomsTable).set(updates).where(eq(roomsTable.id, id));
    await refreshSyncKey("rooms");
  }
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

export async function getRoomPosition(roomId: number): Promise<RoomPosition | null> {
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
      .set({ floor: input.floor, posX: input.posX, posY: input.posY, updatedAt })
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

export async function getBuildingById(id: number): Promise<BuildingAdmin | null> {
  const rows = await db.select().from(buildingsTable).where(eq(buildingsTable.id, id)).limit(1);
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

export async function updateBuilding(id: number, input: BuildingUpdateInput): Promise<void> {
  const updates: Record<string, unknown> = {};
  if (input.buildingName !== undefined) updates["buildingName"] = input.buildingName;
  if (input.lat !== undefined) updates["lat"] = input.lat;
  if (input.lon !== undefined) updates["lon"] = input.lon;
  if (input.buildingType !== undefined) updates["buildingType"] = input.buildingType;
  if (input.directions !== undefined) updates["directions"] = input.directions;

  if (Object.keys(updates).length > 0) {
    await db.update(buildingsTable).set(updates).where(eq(buildingsTable.id, id));
    await refreshSyncKey("buildings");
  }
}

// ── Colleges ──

export type CollegeAdmin = typeof collegesTable.$inferSelect;

export async function getCollegeById(id: number): Promise<CollegeAdmin | null> {
  const rows = await db.select().from(collegesTable).where(eq(collegesTable.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getAllCollegesAdmin(): Promise<CollegeAdmin[]> {
  return db.select().from(collegesTable).orderBy(collegesTable.collegeName);
}

export async function updateCollege(id: number, collegeName: string): Promise<void> {
  await db.update(collegesTable).set({ collegeName }).where(eq(collegesTable.id, id));
  await refreshSyncKey("colleges");
}

// ── Divisions ──

export type DivisionAdmin = typeof divisionsTable.$inferSelect;

export async function getDivisionById(id: number): Promise<DivisionAdmin | null> {
  const rows = await db.select().from(divisionsTable).where(eq(divisionsTable.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getAllDivisionsAdmin(): Promise<DivisionAdmin[]> {
  return db.select().from(divisionsTable).orderBy(divisionsTable.divisionName);
}

export async function updateDivision(id: number, divisionName: string): Promise<void> {
  await db.update(divisionsTable).set({ divisionName }).where(eq(divisionsTable.id, id));
  await refreshSyncKey("divisions");
}

// ── Dorms ──

export type DormAdmin = typeof dormsTable.$inferSelect;

export async function getDormById(id: number): Promise<DormAdmin | null> {
  const rows = await db.select().from(dormsTable).where(eq(dormsTable.id, id)).limit(1);
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

export async function updateDorm(id: number, input: DormUpdateInput): Promise<void> {
  const updates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) updates[key] = value;
  }
  if (Object.keys(updates).length > 0) {
    await db.update(dormsTable).set(updates).where(eq(dormsTable.id, id));
    await refreshSyncKey("dorms");
  }
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
