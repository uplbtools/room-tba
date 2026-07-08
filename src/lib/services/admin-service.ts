import { and, eq, ne, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import {
  buildingsTable,
  collegesTable,
  divisionsTable,
  dormsTable,
  editorHistoryTable,
  eventLocationsTable,
  eventRouteStopsTable,
  eventRoutesTable,
  eventsTable,
  placesTable,
  roomsTable,
  roomPositionsTable,
  updateTable,
} from "@drizzle/schema";
import { normalizeEntityName } from "@lib/entity-names";
import { normalizePlaceCategory } from "@constants/place-categories";
import { db } from "@lib/db";
import {
  buildingIsrPath,
  collegeIsrPath,
  divisionIsrPath,
  dormIsrPath,
  eventIsrPath,
  revalidateIsrPaths,
  roomIsrPath,
} from "@lib/isr-revalidate";
import { getEventById } from "./event-service";
import type { EventData, PlaceData, RoomData } from "@lib/types";
import { EditConflictError } from "./edit-conflict-error";

export { EditConflictError } from "./edit-conflict-error";

// ── Sync key refresh ──

export class DuplicateSlugError extends Error {
  slug: string;

  constructor(slug: string) {
    super(`An event with slug "${slug}" already exists.`);
    this.name = "DuplicateSlugError";
    this.slug = slug;
  }
}

export type MergeEntityType =
  | "room"
  | "building"
  | "college"
  | "division"
  | "dorm";

export class DuplicateNameError<TCandidate = unknown> extends Error {
  entityType: MergeEntityType;
  candidate: TCandidate;
  attemptedName: string;

  constructor(
    entityType: MergeEntityType,
    candidate: TCandidate,
    attemptedName: string,
  ) {
    super(`A ${entityType} with a similar name already exists.`);
    this.name = "DuplicateNameError";
    this.entityType = entityType;
    this.candidate = candidate;
    this.attemptedName = attemptedName;
  }
}

/** Refresh the sync key for a table so viewers detect the change and re-sync. */
export async function refreshSyncKey(
  tableName: string,
  revalidatePaths?: string[],
): Promise<void> {
  await db
    .update(updateTable)
    .set({ syncKey: randomUUID() })
    .where(eq(updateTable.tableName, tableName));
  revalidateIsrPaths(revalidatePaths);
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
  summary?: string | null;
};

export type EditorHistoryOverride = {
  action?: string;
  summary?: string | null;
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
  summary = null,
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
    summary,
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
      imageUrl: roomsTable.imageUrl,
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
      imageUrl: roomsTable.imageUrl,
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
  imageUrl?: string | null;
};

export async function findRoomMergeCandidate(
  roomCode: string,
  excludeId: number,
): Promise<RoomData | null> {
  const normalized = normalizeEntityName(roomCode);
  if (!normalized) return null;

  const rows = await db
    .select({ id: roomsTable.id, roomCode: roomsTable.roomCode })
    .from(roomsTable)
    .where(ne(roomsTable.id, excludeId));

  for (const row of rows) {
    if (normalizeEntityName(row.roomCode) === normalized) {
      return getRoomById(row.id);
    }
  }

  return null;
}

export async function findBuildingMergeCandidate(
  buildingName: string,
  excludeId: number,
): Promise<BuildingAdmin | null> {
  const normalized = normalizeEntityName(buildingName);
  if (!normalized) return null;

  const rows = await db
    .select({
      id: buildingsTable.id,
      buildingName: buildingsTable.buildingName,
    })
    .from(buildingsTable)
    .where(ne(buildingsTable.id, excludeId));

  for (const row of rows) {
    if (normalizeEntityName(row.buildingName) === normalized) {
      return getBuildingById(row.id);
    }
  }

  return null;
}

export async function findCollegeMergeCandidate(
  collegeName: string,
  excludeId: number,
): Promise<CollegeAdmin | null> {
  const normalized = normalizeEntityName(collegeName);
  if (!normalized) return null;

  const rows = await db
    .select({ id: collegesTable.id, collegeName: collegesTable.collegeName })
    .from(collegesTable)
    .where(ne(collegesTable.id, excludeId));

  for (const row of rows) {
    if (normalizeEntityName(row.collegeName) === normalized) {
      return getCollegeById(row.id);
    }
  }

  return null;
}

export async function findDivisionMergeCandidate(
  divisionName: string,
  excludeId: number,
): Promise<DivisionAdmin | null> {
  const normalized = normalizeEntityName(divisionName);
  if (!normalized) return null;

  const rows = await db
    .select({
      id: divisionsTable.id,
      divisionName: divisionsTable.divisionName,
    })
    .from(divisionsTable)
    .where(ne(divisionsTable.id, excludeId));

  for (const row of rows) {
    if (normalizeEntityName(row.divisionName) === normalized) {
      return getDivisionById(row.id);
    }
  }

  return null;
}

export async function findDormMergeCandidate(
  dormName: string,
  excludeId: number,
): Promise<DormAdmin | null> {
  const normalized = normalizeEntityName(dormName);
  if (!normalized) return null;

  const rows = await db
    .select({ id: dormsTable.id, dormName: dormsTable.dormName })
    .from(dormsTable)
    .where(ne(dormsTable.id, excludeId));

  for (const row of rows) {
    if (normalizeEntityName(row.dormName) === normalized) {
      return getDormById(row.id);
    }
  }

  return null;
}

export async function updateRoom(
  id: number,
  input: RoomUpdateInput,
  expectedVersion?: number,
  editedBy = "admin",
  history?: EditorHistoryOverride,
): Promise<RoomData | null> {
  const updates: Record<string, unknown> = {};
  if (input.roomCode !== undefined) updates.roomCode = input.roomCode;
  if (input.directions !== undefined)
    updates.directions = input.directions || null;
  if (input.buildingId !== undefined)
    updates.buildingId = input.buildingId ?? null;
  if (input.collegeId !== undefined)
    updates.collegeId = input.collegeId ?? null;
  if (input.divisionId !== undefined)
    updates.divisionId = input.divisionId ?? null;
  if (input.imageUrl !== undefined) updates.imageUrl = input.imageUrl;

  if (Object.keys(updates).length > 0) {
    if (input.roomCode !== undefined) {
      const candidate = await findRoomMergeCandidate(input.roomCode, id);
      if (candidate) {
        throw new DuplicateNameError("room", candidate, input.roomCode);
      }
    }

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
        action: history?.action ?? "update",
        before,
        after,
        versionBefore: before.version,
        versionAfter: after.version,
        editedBy,
        summary: history?.summary ?? null,
      });
    }

    const revalidatePaths = ["/room/"];
    if (after) revalidatePaths.push(roomIsrPath(after));
    if (before && after && before.code !== after.code) {
      revalidatePaths.push(roomIsrPath(before));
    }
    await refreshSyncKey("rooms", revalidatePaths);
    return after ?? (await getRoomById(id));
  }

  return getRoomById(id);
}

export type RoomCreateInput = {
  roomCode: string;
  directions?: string | null;
  buildingId?: number | null;
  collegeId?: number | null;
  divisionId?: number | null;
};

export async function createRoom(
  input: RoomCreateInput,
  editedBy = "admin",
): Promise<RoomData | null> {
  const [inserted] = await db
    .insert(roomsTable)
    .values({
      roomCode: input.roomCode.trim(),
      directions: input.directions?.trim() || null,
      buildingId: input.buildingId ?? null,
      collegeId: input.collegeId ?? null,
      divisionId: input.divisionId ?? null,
    })
    .returning({ id: roomsTable.id });

  if (!inserted) return null;

  const after = await getRoomById(inserted.id);
  if (after) {
    await recordEditorHistory({
      entityType: "room",
      entityId: inserted.id,
      action: "create",
      before: null,
      after,
      versionAfter: after.version,
      editedBy,
    });
  }
  await refreshSyncKey(
    "rooms",
    after ? [roomIsrPath(after), "/room/"] : ["/room/"],
  );
  return after;
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

function serializeRoomPosition(position: RoomPosition | null) {
  if (!position) return null;
  return {
    floor: position.floor,
    posX: position.posX,
    posY: position.posY,
    updatedAt: position.updatedAt,
    roomId: position.roomId,
  };
}

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
  const room = await getRoomById(roomId);
  await refreshSyncKey(
    "rooms",
    room ? [roomIsrPath(room), "/room/"] : ["/room/"],
  );
}

export async function updateRoomPosition(
  roomId: number,
  input: RoomPositionUpdateInput,
  expectedVersion?: number,
  editedBy = "admin",
): Promise<RoomData | null> {
  const before = await getRoomById(roomId);
  if (!before) return null;

  const beforePosition = await getRoomPosition(roomId);
  const updatedAt = new Date().toISOString();

  await db.transaction(async (tx) => {
    const where =
      expectedVersion === undefined
        ? eq(roomsTable.id, roomId)
        : and(
            eq(roomsTable.id, roomId),
            eq(roomsTable.version, expectedVersion),
          );

    const [updated] = await tx
      .update(roomsTable)
      .set({
        version: sql`"version" + 1`,
        updatedAt: sql`now()`,
      })
      .where(where)
      .returning({ id: roomsTable.id });

    if (!updated && expectedVersion !== undefined) {
      throw new EditConflictError(await getRoomById(roomId));
    }

    const existing = await tx
      .select({ id: roomPositionsTable.id })
      .from(roomPositionsTable)
      .where(eq(roomPositionsTable.roomId, roomId))
      .limit(1);

    if (existing[0]) {
      await tx
        .update(roomPositionsTable)
        .set({
          floor: input.floor,
          posX: input.posX,
          posY: input.posY,
          updatedAt,
        })
        .where(eq(roomPositionsTable.id, existing[0].id));
    } else {
      await tx.insert(roomPositionsTable).values({
        floor: input.floor,
        posX: input.posX,
        posY: input.posY,
        updatedAt,
        roomId,
      });
    }
  });

  const [after, afterPosition] = await Promise.all([
    getRoomById(roomId),
    getRoomPosition(roomId),
  ]);

  if (after) {
    await recordEditorHistory({
      entityType: "room",
      entityId: roomId,
      action: "update_position",
      before: {
        ...before,
        position: serializeRoomPosition(beforePosition),
      },
      after: {
        ...after,
        position: serializeRoomPosition(afterPosition),
      },
      versionBefore: before.version,
      versionAfter: after.version,
      editedBy,
    });
  }

  await refreshSyncKey(
    "rooms",
    after ? [roomIsrPath(after), "/room/"] : ["/room/"],
  );
  return after;
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
  imageUrl?: string | null;
};

export async function updateBuilding(
  id: number,
  input: BuildingUpdateInput,
  expectedVersion?: number,
  editedBy = "admin",
  history?: EditorHistoryOverride,
): Promise<BuildingAdmin | null> {
  const updates: Record<string, unknown> = {};
  if (input.buildingName !== undefined)
    updates.buildingName = input.buildingName;
  if (input.lat !== undefined) updates.lat = input.lat;
  if (input.lon !== undefined) updates.lon = input.lon;
  if (input.buildingType !== undefined)
    updates.buildingType = input.buildingType;
  if (input.directions !== undefined) updates.directions = input.directions;
  if (input.imageUrl !== undefined) updates.imageUrl = input.imageUrl;

  if (Object.keys(updates).length > 0) {
    if (input.buildingName !== undefined) {
      const candidate = await findBuildingMergeCandidate(
        input.buildingName,
        id,
      );
      if (candidate) {
        throw new DuplicateNameError("building", candidate, input.buildingName);
      }
    }

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
        action: history?.action ?? "update",
        before,
        after: updated,
        versionBefore: before.version,
        versionAfter: updated.version,
        editedBy,
        summary: history?.summary ?? null,
      });
    }

    const revalidatePaths = ["/building/"];
    if (updated) revalidatePaths.push(buildingIsrPath(updated));
    if (before && updated && before.buildingName !== updated.buildingName) {
      revalidatePaths.push(buildingIsrPath(before));
    }
    await refreshSyncKey("buildings", revalidatePaths);
    return updated ?? (await getBuildingById(id));
  }

  return getBuildingById(id);
}

export type BuildingCreateInput = {
  buildingName: string;
  lat: number;
  lon: number;
  buildingType?: "admin" | "non-admin";
  directions?: string;
};

export async function createBuilding(
  input: BuildingCreateInput,
  editedBy = "admin",
): Promise<BuildingAdmin | null> {
  const [inserted] = await db
    .insert(buildingsTable)
    .values({
      buildingName: input.buildingName.trim(),
      lat: input.lat,
      lon: input.lon,
      buildingType: input.buildingType ?? "non-admin",
      directions: input.directions?.trim() ?? "",
    })
    .returning();

  if (!inserted) return null;

  await recordEditorHistory({
    entityType: "building",
    entityId: inserted.id,
    action: "create",
    before: null,
    after: inserted,
    versionAfter: inserted.version,
    editedBy,
  });
  await refreshSyncKey("buildings", [buildingIsrPath(inserted), "/building/"]);
  return inserted;
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
  expectedVersion?: number,
  editedBy = "admin",
  history?: EditorHistoryOverride,
): Promise<CollegeAdmin | null> {
  const candidate = await findCollegeMergeCandidate(collegeName, id);
  if (candidate) {
    throw new DuplicateNameError("college", candidate, collegeName);
  }

  const before = await getCollegeById(id);
  const where =
    expectedVersion === undefined
      ? eq(collegesTable.id, id)
      : and(
          eq(collegesTable.id, id),
          eq(collegesTable.version, expectedVersion),
        );
  const [updated] = await db
    .update(collegesTable)
    .set({
      collegeName,
      version: sql`"version" + 1`,
      updatedAt: sql`now()`,
    })
    .where(where)
    .returning();

  if (!updated && expectedVersion !== undefined) {
    throw new EditConflictError(await getCollegeById(id));
  }

  if (before && updated) {
    await recordEditorHistory({
      entityType: "college",
      entityId: id,
      action: history?.action ?? "update",
      before,
      after: updated,
      versionBefore: before.version,
      versionAfter: updated.version,
      editedBy,
      summary: history?.summary ?? null,
    });
  }

  await refreshSyncKey("colleges", [
    collegeIsrPath(updated ?? before),
    "/college/",
  ]);
  return updated ?? (await getCollegeById(id));
}

export async function createCollege(
  collegeName: string,
  editedBy = "admin",
): Promise<CollegeAdmin | null> {
  const trimmed = collegeName.trim();
  const [inserted] = await db
    .insert(collegesTable)
    .values({ collegeName: trimmed })
    .returning();

  if (!inserted) return null;

  await recordEditorHistory({
    entityType: "college",
    entityId: inserted.id,
    action: "create",
    before: null,
    after: inserted,
    versionAfter: inserted.version,
    editedBy,
  });
  await refreshSyncKey("colleges", [collegeIsrPath(inserted), "/college/"]);
  return inserted;
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

export type DivisionUpdateInput = {
  divisionName?: string;
  collegeId?: number | null;
};

export async function updateDivision(
  id: number,
  input: DivisionUpdateInput,
  expectedVersion?: number,
  editedBy = "admin",
  history?: EditorHistoryOverride,
): Promise<DivisionAdmin | null> {
  const updates: Record<string, unknown> = {};
  if (input.divisionName !== undefined) {
    updates.divisionName = input.divisionName;
  }
  if (input.collegeId !== undefined) {
    updates.collegeId = input.collegeId ?? null;
  }

  if (Object.keys(updates).length === 0) {
    return getDivisionById(id);
  }

  if (input.divisionName !== undefined) {
    const candidate = await findDivisionMergeCandidate(input.divisionName, id);
    if (candidate) {
      throw new DuplicateNameError("division", candidate, input.divisionName);
    }
  }

  const before = await getDivisionById(id);
  const where =
    expectedVersion === undefined
      ? eq(divisionsTable.id, id)
      : and(
          eq(divisionsTable.id, id),
          eq(divisionsTable.version, expectedVersion),
        );
  const [updated] = await db
    .update(divisionsTable)
    .set({
      ...updates,
      version: sql`"version" + 1`,
      updatedAt: sql`now()`,
    })
    .where(where)
    .returning();

  if (!updated && expectedVersion !== undefined) {
    throw new EditConflictError(await getDivisionById(id));
  }

  if (before && updated) {
    await recordEditorHistory({
      entityType: "division",
      entityId: id,
      action: history?.action ?? "update",
      before,
      after: updated,
      versionBefore: before.version,
      versionAfter: updated.version,
      editedBy,
      summary: history?.summary ?? null,
    });
  }

  await refreshSyncKey("divisions", [
    divisionIsrPath(updated ?? before),
    "/division/",
  ]);
  return updated ?? (await getDivisionById(id));
}

export type DivisionCreateInput = {
  divisionName: string;
  collegeId?: number | null;
};

export async function createDivision(
  input: DivisionCreateInput | string,
  editedBy = "admin",
): Promise<DivisionAdmin | null> {
  const normalized =
    typeof input === "string"
      ? { divisionName: input.trim(), collegeId: null as number | null }
      : {
          divisionName: input.divisionName.trim(),
          collegeId: input.collegeId ?? null,
        };

  const [inserted] = await db
    .insert(divisionsTable)
    .values({
      divisionName: normalized.divisionName,
      collegeId: normalized.collegeId,
    })
    .returning();

  if (!inserted) return null;

  await recordEditorHistory({
    entityType: "division",
    entityId: inserted.id,
    action: "create",
    before: null,
    after: inserted,
    versionAfter: inserted.version,
    editedBy,
  });
  await refreshSyncKey("divisions", [divisionIsrPath(inserted), "/division/"]);
  return inserted;
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
  imageUrl: string | null;
}>;

export async function updateDorm(
  id: number,
  input: DormUpdateInput,
  expectedVersion?: number,
  editedBy = "admin",
  history?: EditorHistoryOverride,
): Promise<DormAdmin | null> {
  const updates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) updates[key] = value;
  }
  if (Object.keys(updates).length > 0) {
    if (input.dormName !== undefined) {
      const candidate = await findDormMergeCandidate(input.dormName, id);
      if (candidate) {
        throw new DuplicateNameError("dorm", candidate, input.dormName);
      }
    }

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
        action: history?.action ?? "update",
        before,
        after: updated,
        versionBefore: before.version,
        versionAfter: updated.version,
        editedBy,
        summary: history?.summary ?? null,
      });
    }

    await refreshSyncKey("dorms", [dormIsrPath(updated ?? before), "/dorm/"]);
    return updated ?? (await getDormById(id));
  }

  return getDormById(id);
}

export type PlaceUpdateInput = Partial<{
  name: string;
  category: string;
  lat: number | null;
  lon: number | null;
  description: string | null;
  hours: string | null;
  websiteLink: string | null;
  facebookLink: string | null;
  imageUrl: string | null;
}>;

async function getPlaceById(id: number): Promise<PlaceData | null> {
  const [row] = await db
    .select()
    .from(placesTable)
    .where(eq(placesTable.id, id))
    .limit(1);
  return row ?? null;
}

export async function updatePlace(
  id: number,
  input: PlaceUpdateInput,
  expectedVersion?: number,
  _editedBy = "admin",
  _history?: EditorHistoryOverride,
): Promise<PlaceData | null> {
  const updates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) updates[key] = value;
  }
  if (input.category !== undefined) {
    updates.category = normalizePlaceCategory(input.category) ?? "landmark";
  }
  if (Object.keys(updates).length === 0) return getPlaceById(id);

  const where =
    expectedVersion === undefined
      ? eq(placesTable.id, id)
      : and(eq(placesTable.id, id), eq(placesTable.version, expectedVersion));
  const [updated] = await db
    .update(placesTable)
    .set({ ...updates, version: sql`"version" + 1`, updatedAt: sql`now()` })
    .where(where)
    .returning();

  if (!updated && expectedVersion !== undefined) {
    throw new EditConflictError(await getPlaceById(id));
  }
  await refreshSyncKey("places");
  return updated ?? (await getPlaceById(id));
}

export type PlaceCreateInput = PlaceUpdateInput & {
  name: string;
  category: string;
};

export async function createPlace(
  input: PlaceCreateInput,
  _editedBy = "admin",
): Promise<PlaceData | null> {
  const [inserted] = await db
    .insert(placesTable)
    .values({
      name: input.name.trim(),
      category: normalizePlaceCategory(input.category) ?? "landmark",
      lat: input.lat ?? null,
      lon: input.lon ?? null,
      description: input.description ?? null,
      hours: input.hours ?? null,
      websiteLink: input.websiteLink ?? null,
      facebookLink: input.facebookLink ?? null,
      imageUrl: input.imageUrl ?? null,
    })
    .returning();
  await refreshSyncKey("places");
  return inserted ?? null;
}

export type DormCreateInput = DormUpdateInput & {
  dormName: string;
  gender: string;
};

export async function createDorm(
  input: DormCreateInput,
  editedBy = "admin",
): Promise<DormAdmin | null> {
  const [inserted] = await db
    .insert(dormsTable)
    .values({
      dormName: input.dormName.trim(),
      gender: input.gender.trim(),
      shortName: input.shortName ?? null,
      lat: input.lat ?? null,
      lon: input.lon ?? null,
      capacity: input.capacity ?? null,
      managingOffice: input.managingOffice ?? null,
      contactEmail: input.contactEmail ?? null,
      amenities: input.amenities ?? null,
      osmLink: input.osmLink ?? null,
      description: input.description ?? null,
      isUpManaged: input.isUpManaged ?? true,
      priceRange: input.priceRange ?? null,
      contactPhone: input.contactPhone ?? null,
      facebookLink: input.facebookLink ?? null,
    })
    .returning();

  if (!inserted) return null;

  await recordEditorHistory({
    entityType: "dorm",
    entityId: inserted.id,
    action: "create",
    before: null,
    after: inserted,
    versionAfter: inserted.version,
    editedBy,
  });
  await refreshSyncKey("dorms", [dormIsrPath(inserted), "/dorm/"]);
  return inserted;
}

// ── Events ──

export type EventLocationWriteInput = Partial<{
  id: number;
  anchorType: "building" | "dorm" | "custom";
  buildingId: number | null;
  dormId: number | null;
  label: string;
  lat: number | null;
  lon: number | null;
  highlightPriority: number;
  sortOrder: number;
  isPrimary: boolean;
}>;

export type EventRouteStopWriteInput = Partial<{
  id: number;
  eventLocationId: number | null;
  label: string;
  lat: number | null;
  lon: number | null;
  sortOrder: number;
}>;

export type EventRouteWriteInput = Partial<{
  id: number;
  name: string;
  description: string | null;
  sortOrder: number;
  stops: EventRouteStopWriteInput[];
}>;

export type EventWriteInput = Partial<{
  slug: string;
  title: string;
  description: string | null;
  category: "tradition" | "fair" | "ceremony" | "sports" | "other";
  startsAt: string;
  endsAt: string;
  timezone: string;
  recurrence: "none" | "annual" | "every_1st_sem" | "every_2nd_sem";
  isActive: boolean;
  sourceUrl: string | null;
  imageUrl: string | null;
  priority: number;
  includeInSeo: boolean;
  locations: EventLocationWriteInput[];
  routes: EventRouteWriteInput[];
}>;

const EVENT_SYNC_TABLES = [
  "events",
  "event_locations",
  "event_routes",
  "event_route_stops",
];

async function refreshEventSyncKeys(revalidatePaths?: string[]) {
  await Promise.all(
    EVENT_SYNC_TABLES.map((tableName) => refreshSyncKey(tableName)),
  );
  revalidateIsrPaths(revalidatePaths);
}

function getEventUpdates(input: EventWriteInput) {
  const updates: Record<string, unknown> = {};
  if (input.slug !== undefined) updates.slug = input.slug;
  if (input.title !== undefined) updates.title = input.title;
  if (input.description !== undefined) updates.description = input.description;
  if (input.category !== undefined) updates.category = input.category;
  if (input.startsAt !== undefined) updates.startsAt = input.startsAt;
  if (input.endsAt !== undefined) updates.endsAt = input.endsAt;
  if (input.timezone !== undefined) updates.timezone = input.timezone;
  if (input.recurrence !== undefined) updates.recurrence = input.recurrence;
  if (input.isActive !== undefined) updates.isActive = input.isActive;
  if (input.sourceUrl !== undefined) updates.sourceUrl = input.sourceUrl;
  if (input.imageUrl !== undefined) updates.imageUrl = input.imageUrl;
  if (input.priority !== undefined) updates.priority = input.priority;
  if (input.includeInSeo !== undefined)
    updates.includeInSeo = input.includeInSeo;
  return updates;
}

export async function createEvent(
  input: EventWriteInput,
  editedBy = "admin",
): Promise<EventData | null> {
  const slug = input.slug ?? "";
  if (slug) {
    const [existing] = await db
      .select({ id: eventsTable.id })
      .from(eventsTable)
      .where(eq(eventsTable.slug, slug))
      .limit(1);
    if (existing) throw new DuplicateSlugError(slug);
  }

  const [inserted] = await db
    .insert(eventsTable)
    .values({
      slug: input.slug ?? "",
      title: input.title ?? "",
      description: input.description ?? null,
      category: input.category ?? "other",
      startsAt: input.startsAt ?? new Date().toISOString(),
      endsAt: input.endsAt ?? new Date().toISOString(),
      timezone: input.timezone ?? "Asia/Manila",
      recurrence: input.recurrence ?? "none",
      isActive: input.isActive ?? true,
      sourceUrl: input.sourceUrl ?? null,
      imageUrl: input.imageUrl ?? null,
      priority: input.priority ?? 0,
      includeInSeo: input.includeInSeo ?? false,
    })
    .returning({ id: eventsTable.id });

  if (!inserted) return null;
  await replaceEventChildren(inserted.id, input);

  const after = await getEventById(inserted.id, { includeInactive: true });
  if (after) {
    await recordEditorHistory({
      entityType: "event",
      entityId: inserted.id,
      action: "create",
      before: null,
      after,
      versionAfter: after.version,
      editedBy,
    });
  }
  await refreshEventSyncKeys(
    after?.slug ? [eventIsrPath(after.slug), "/event/"] : ["/event/"],
  );
  return after;
}

export async function updateEvent(
  id: number,
  input: EventWriteInput,
  expectedVersion?: number,
  editedBy = "admin",
  history?: EditorHistoryOverride,
): Promise<EventData | null> {
  const before = await getEventById(id, { includeInactive: true });
  if (!before) return null;

  const updates = getEventUpdates(input);
  const shouldReplaceChildren =
    input.locations !== undefined || input.routes !== undefined;
  if (Object.keys(updates).length === 0 && !shouldReplaceChildren) {
    return before;
  }

  await db.transaction(async (tx) => {
    const where =
      expectedVersion === undefined
        ? eq(eventsTable.id, id)
        : and(eq(eventsTable.id, id), eq(eventsTable.version, expectedVersion));
    const [updated] = await tx
      .update(eventsTable)
      .set({
        ...updates,
        version: sql`"version" + 1`,
        updatedAt: sql`now()`,
      })
      .where(where)
      .returning({ id: eventsTable.id });

    if (!updated && expectedVersion !== undefined) {
      throw new EditConflictError(
        await getEventById(id, { includeInactive: true }),
      );
    }

    if (shouldReplaceChildren) {
      await replaceEventChildren(id, input, tx);
    }
  });

  const after = await getEventById(id, { includeInactive: true });
  if (before && after) {
    await recordEditorHistory({
      entityType: "event",
      entityId: id,
      action: history?.action ?? "update",
      before,
      after,
      versionBefore: before.version,
      versionAfter: after.version,
      editedBy,
      summary: history?.summary ?? null,
    });
  }
  const eventPaths = ["/event/"];
  if (after?.slug) eventPaths.push(eventIsrPath(after.slug));
  if (before.slug !== after?.slug) eventPaths.push(eventIsrPath(before.slug));
  await refreshEventSyncKeys(eventPaths);
  return after;
}

export async function deactivateEvent(
  id: number,
  expectedVersion?: number,
  editedBy = "admin",
) {
  return updateEvent(id, { isActive: false }, expectedVersion, editedBy);
}

export async function updateEventLocations(
  id: number,
  locations: EventLocationWriteInput[],
  expectedVersion?: number,
  editedBy = "admin",
): Promise<EventData | null> {
  const before = await getEventById(id, { includeInactive: true });

  await db.transaction(async (tx) => {
    const where =
      expectedVersion === undefined
        ? eq(eventsTable.id, id)
        : and(eq(eventsTable.id, id), eq(eventsTable.version, expectedVersion));
    const [updated] = await tx
      .update(eventsTable)
      .set({
        version: sql`"version" + 1`,
        updatedAt: sql`now()`,
      })
      .where(where)
      .returning({ id: eventsTable.id });

    if (!updated && expectedVersion !== undefined) {
      throw new EditConflictError(
        await getEventById(id, { includeInactive: true }),
      );
    }

    await upsertEventLocations(id, locations, tx);
  });

  const after = await getEventById(id, { includeInactive: true });
  if (before && after) {
    await recordEditorHistory({
      entityType: "event",
      entityId: id,
      action: "update_locations",
      before,
      after,
      versionBefore: before.version,
      versionAfter: after.version,
      editedBy,
    });
  }
  await refreshEventSyncKeys(
    after?.slug ? [eventIsrPath(after.slug), "/event/"] : ["/event/"],
  );
  return after;
}

type EventLocationRow = typeof eventLocationsTable.$inferSelect;

function getEventLocationFields(
  location: EventLocationWriteInput,
  index: number,
  existing?: EventLocationRow,
) {
  const anchorType = location.anchorType ?? existing?.anchorType ?? "custom";
  const customCoords =
    anchorType === "custom"
      ? {
          lat:
            location.lat !== undefined ? location.lat : (existing?.lat ?? null),
          lon:
            location.lon !== undefined ? location.lon : (existing?.lon ?? null),
        }
      : { lat: null, lon: null };

  return {
    anchorType,
    buildingId:
      location.buildingId !== undefined
        ? location.buildingId
        : (existing?.buildingId ?? null),
    dormId:
      location.dormId !== undefined
        ? location.dormId
        : (existing?.dormId ?? null),
    label: location.label ?? existing?.label ?? "Event marker",
    lat: customCoords.lat,
    lon: customCoords.lon,
    highlightPriority:
      location.highlightPriority ?? existing?.highlightPriority ?? 0,
    sortOrder: location.sortOrder ?? existing?.sortOrder ?? index,
    isPrimary: location.isPrimary ?? existing?.isPrimary ?? index === 0,
  };
}

async function upsertEventLocations(
  eventId: number,
  locations: EventLocationWriteInput[],
  tx: typeof db = db,
) {
  const existingLocations = await tx
    .select()
    .from(eventLocationsTable)
    .where(eq(eventLocationsTable.eventId, eventId));
  const existingById = new Map(
    existingLocations.map((location) => [location.id, location]),
  );
  const retainedLocationIds = new Set<number>();

  for (const [index, location] of locations.entries()) {
    const existing =
      location.id !== undefined ? existingById.get(location.id) : undefined;
    const fields = getEventLocationFields(location, index, existing);

    if (existing) {
      await tx
        .update(eventLocationsTable)
        .set({ ...fields, updatedAt: sql`now()` })
        .where(eq(eventLocationsTable.id, existing.id));
      retainedLocationIds.add(existing.id);
      continue;
    }

    const [inserted] = await tx
      .insert(eventLocationsTable)
      .values({ eventId, ...fields })
      .returning({ id: eventLocationsTable.id });
    if (inserted) retainedLocationIds.add(inserted.id);
  }

  const removedLocations = existingLocations.filter(
    (location) => !retainedLocationIds.has(location.id),
  );
  for (const location of removedLocations) {
    await tx
      .update(eventRouteStopsTable)
      .set({ eventLocationId: null })
      .where(eq(eventRouteStopsTable.eventLocationId, location.id));
    await tx
      .delete(eventLocationsTable)
      .where(eq(eventLocationsTable.id, location.id));
  }
}

async function replaceEventChildren(
  eventId: number,
  input: Pick<EventWriteInput, "locations" | "routes">,
  tx: typeof db = db,
) {
  if (input.routes !== undefined) {
    const existingRoutes = await tx
      .select({ id: eventRoutesTable.id })
      .from(eventRoutesTable)
      .where(eq(eventRoutesTable.eventId, eventId));
    for (const route of existingRoutes) {
      await tx
        .delete(eventRouteStopsTable)
        .where(eq(eventRouteStopsTable.routeId, route.id));
    }
    await tx
      .delete(eventRoutesTable)
      .where(eq(eventRoutesTable.eventId, eventId));
  }

  const locationsReplaced = input.locations !== undefined;
  const locationsHaveIds =
    input.locations?.some((location) => location.id !== undefined) ?? false;
  const locationIdByOldId = new Map<number, number>();
  const locationIdByIndex = new Map<number, number>();

  if (input.locations !== undefined) {
    if (input.routes === undefined) {
      const existingLocations = await tx
        .select({ id: eventLocationsTable.id })
        .from(eventLocationsTable)
        .where(eq(eventLocationsTable.eventId, eventId));
      for (const location of existingLocations) {
        await tx
          .update(eventRouteStopsTable)
          .set({ eventLocationId: null })
          .where(eq(eventRouteStopsTable.eventLocationId, location.id));
      }
    }
    await tx
      .delete(eventLocationsTable)
      .where(eq(eventLocationsTable.eventId, eventId));
  }

  if (input.locations !== undefined && input.locations.length > 0) {
    const insertedLocations = await tx
      .insert(eventLocationsTable)
      .values(
        input.locations.map((location, index) => ({
          eventId,
          anchorType: location.anchorType ?? "custom",
          buildingId: location.buildingId ?? null,
          dormId: location.dormId ?? null,
          label: location.label ?? "Event marker",
          lat: location.lat ?? null,
          lon: location.lon ?? null,
          highlightPriority: location.highlightPriority ?? 0,
          sortOrder: location.sortOrder ?? index,
          isPrimary: location.isPrimary ?? index === 0,
        })),
      )
      .returning({ id: eventLocationsTable.id });

    input.locations.forEach((location, index) => {
      const newId = insertedLocations[index]?.id;
      if (newId === undefined) return;
      locationIdByIndex.set(index, newId);
      if (location.id !== undefined) locationIdByOldId.set(location.id, newId);
    });
  }

  const resolveStopLocationId = (
    eventLocationId: number | null | undefined,
  ): number | null => {
    if (eventLocationId === null || eventLocationId === undefined) return null;
    if (!locationsReplaced) return eventLocationId;
    const byOldId = locationIdByOldId.get(eventLocationId);
    if (byOldId !== undefined) return byOldId;
    if (!locationsHaveIds) {
      return locationIdByIndex.get(eventLocationId) ?? null;
    }
    return null;
  };

  if (input.routes !== undefined && input.routes.length > 0) {
    for (const [routeIndex, route] of input.routes.entries()) {
      const [insertedRoute] = await tx
        .insert(eventRoutesTable)
        .values({
          eventId,
          name: route.name ?? "Event route",
          description: route.description ?? null,
          sortOrder: route.sortOrder ?? routeIndex,
        })
        .returning({ id: eventRoutesTable.id });

      if (!insertedRoute || !route.stops || route.stops.length === 0) continue;
      await tx.insert(eventRouteStopsTable).values(
        route.stops.map((stop, stopIndex) => ({
          routeId: insertedRoute.id,
          eventLocationId: resolveStopLocationId(stop.eventLocationId),
          label: stop.label ?? "Route stop",
          lat: stop.lat ?? null,
          lon: stop.lon ?? null,
          sortOrder: stop.sortOrder ?? stopIndex,
        })),
      );
    }
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
