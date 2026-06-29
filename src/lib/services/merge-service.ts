import { and, eq, sql } from "drizzle-orm";
import {
  buildingsTable,
  classesTable,
  collegesTable,
  divisionsTable,
  dormsTable,
  eventLocationsTable,
  roomsTable,
  roomPositionsTable,
} from "@drizzle/schema";
import { normalizeEntityName } from "@lib/entity-names";
import { db } from "@lib/db";
import type { RoomData } from "@lib/types";
import {
  EditConflictError,
  DuplicateNameError,
  findBuildingMergeCandidate,
  findCollegeMergeCandidate,
  findDivisionMergeCandidate,
  findDormMergeCandidate,
  findRoomMergeCandidate,
  getBuildingById,
  getCollegeById,
  getDivisionById,
  getDormById,
  getRoomById,
  getRoomPosition,
  recordEditorHistory,
  refreshSyncKey,
  type BuildingAdmin,
  type CollegeAdmin,
  type DivisionAdmin,
  type DormAdmin,
} from "./admin-service";

export type RoomMergeInput = {
  sourceId: number;
  targetId: number;
  sourceVersion: number;
  preferredRoomCode?: string;
  editedBy?: string;
};

function pickMergedLabel(
  targetLabel: string,
  sourceLabel: string,
  preferredLabel?: string,
): string {
  if (preferredLabel?.trim()) return preferredLabel.trim();
  if (targetLabel.trim()) return targetLabel.trim();
  return sourceLabel.trim();
}

function pickNullableText(
  target: string | null | undefined,
  source: string | null | undefined,
): string | null {
  const targetTrimmed = target?.trim();
  if (targetTrimmed) return targetTrimmed;
  const sourceTrimmed = source?.trim();
  return sourceTrimmed || null;
}

async function assertNoDuplicateRoomCodesInBuilding(
  buildingId: number,
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
) {
  const rows = await tx
    .select({ roomCode: roomsTable.roomCode })
    .from(roomsTable)
    .where(eq(roomsTable.buildingId, buildingId));

  const seen = new Set<string>();
  for (const row of rows) {
    const normalized = normalizeEntityName(row.roomCode);
    if (seen.has(normalized)) {
      throw new Error(
        `Cannot merge buildings: duplicate room code "${row.roomCode}" would exist in the kept building.`,
      );
    }
    seen.add(normalized);
  }
}

export async function mergeRooms({
  sourceId,
  targetId,
  sourceVersion,
  preferredRoomCode,
  editedBy = "admin",
}: RoomMergeInput): Promise<RoomData> {
  if (sourceId === targetId) {
    throw new Error("Cannot merge a room into itself.");
  }

  const [source, target] = await Promise.all([
    getRoomById(sourceId),
    getRoomById(targetId),
  ]);

  if (!source) throw new Error(`Room ${sourceId} was not found.`);
  if (!target) throw new Error(`Room ${targetId} was not found.`);

  const mergedCode = pickMergedLabel(
    target.code,
    source.code,
    preferredRoomCode,
  );
  const normalizedMerged = normalizeEntityName(mergedCode);
  const sourceNormalized = normalizeEntityName(source.code);
  const targetNormalized = normalizeEntityName(target.code);

  if (
    normalizedMerged !== sourceNormalized &&
    normalizedMerged !== targetNormalized
  ) {
    throw new Error("Merged room code does not match either room.");
  }

  const unrelated = await findRoomMergeCandidate(mergedCode, sourceId);
  if (unrelated && unrelated.id !== targetId) {
    throw new DuplicateNameError("room", unrelated, mergedCode);
  }

  const sourcePosition = await getRoomPosition(sourceId);
  const targetPosition = await getRoomPosition(targetId);

  await db.transaction(async (tx) => {
    const [lockedSource] = await tx
      .select({ id: roomsTable.id })
      .from(roomsTable)
      .where(
        and(eq(roomsTable.id, sourceId), eq(roomsTable.version, sourceVersion)),
      )
      .limit(1);

    if (!lockedSource) {
      throw new EditConflictError(await getRoomById(sourceId));
    }

    await tx
      .update(classesTable)
      .set({ roomId: targetId })
      .where(eq(classesTable.roomId, sourceId));

    if (sourcePosition && !targetPosition) {
      await tx
        .update(roomPositionsTable)
        .set({ roomId: targetId })
        .where(eq(roomPositionsTable.roomId, sourceId));
    } else if (sourcePosition && targetPosition) {
      await tx
        .delete(roomPositionsTable)
        .where(eq(roomPositionsTable.roomId, sourceId));
    }

    await tx
      .update(roomsTable)
      .set({
        roomCode: mergedCode,
        directions: pickNullableText(target.directions, source.directions),
        buildingId: target.buildingId ?? source.buildingId ?? null,
        collegeId: target.collegeId ?? source.collegeId ?? null,
        divisionId: target.divisionId ?? source.divisionId ?? null,
        version: sql`"version" + 1`,
        updatedAt: sql`now()`,
      })
      .where(eq(roomsTable.id, targetId));

    await tx.delete(roomsTable).where(eq(roomsTable.id, sourceId));
  });

  const afterTarget = await getRoomById(targetId);
  if (!afterTarget) {
    throw new Error(`Room ${targetId} could not be loaded after merge.`);
  }

  await recordEditorHistory({
    entityType: "room",
    entityId: targetId,
    action: "merge",
    before: target,
    after: afterTarget,
    versionBefore: target.version,
    versionAfter: afterTarget.version,
    editedBy,
  });

  await recordEditorHistory({
    entityType: "room",
    entityId: sourceId,
    action: "merged_into",
    before: source,
    after: { mergedIntoRoomId: targetId, mergedIntoCode: afterTarget.code },
    versionBefore: source.version,
    editedBy,
  });

  await Promise.all([refreshSyncKey("rooms"), refreshSyncKey("classes")]);

  return afterTarget;
}

export type EntityMergeInput = {
  sourceId: number;
  targetId: number;
  sourceVersion: number;
  preferredName?: string;
  editedBy?: string;
};

export async function mergeBuildings({
  sourceId,
  targetId,
  sourceVersion,
  preferredName,
  editedBy = "admin",
}: EntityMergeInput): Promise<BuildingAdmin> {
  if (sourceId === targetId) {
    throw new Error("Cannot merge a building into itself.");
  }

  const [source, target] = await Promise.all([
    getBuildingById(sourceId),
    getBuildingById(targetId),
  ]);

  if (!source) throw new Error(`Building ${sourceId} was not found.`);
  if (!target) throw new Error(`Building ${targetId} was not found.`);

  const mergedName = pickMergedLabel(
    target.buildingName,
    source.buildingName,
    preferredName,
  );
  const unrelated = await findBuildingMergeCandidate(mergedName, sourceId);
  if (unrelated && unrelated.id !== targetId) {
    throw new DuplicateNameError("building", unrelated, mergedName);
  }

  await db.transaction(async (tx) => {
    const [lockedSource] = await tx
      .select({ id: buildingsTable.id })
      .from(buildingsTable)
      .where(
        and(
          eq(buildingsTable.id, sourceId),
          eq(buildingsTable.version, sourceVersion),
        ),
      )
      .limit(1);

    if (!lockedSource) {
      throw new EditConflictError(await getBuildingById(sourceId));
    }

    await tx
      .update(roomsTable)
      .set({ buildingId: targetId })
      .where(eq(roomsTable.buildingId, sourceId));

    await tx
      .update(eventLocationsTable)
      .set({ buildingId: targetId })
      .where(eq(eventLocationsTable.buildingId, sourceId));

    await assertNoDuplicateRoomCodesInBuilding(targetId, tx);

    await tx
      .update(buildingsTable)
      .set({
        buildingName: mergedName,
        directions:
          target.directions.trim() !== ""
            ? target.directions
            : source.directions,
        lat: target.lat ?? source.lat,
        lon: target.lon ?? source.lon,
        buildingType: target.buildingType ?? source.buildingType,
        version: sql`"version" + 1`,
        updatedAt: sql`now()`,
      })
      .where(eq(buildingsTable.id, targetId));

    await tx.delete(buildingsTable).where(eq(buildingsTable.id, sourceId));
  });

  const afterTarget = await getBuildingById(targetId);
  if (!afterTarget) {
    throw new Error(`Building ${targetId} could not be loaded after merge.`);
  }

  await recordEditorHistory({
    entityType: "building",
    entityId: targetId,
    action: "merge",
    before: target,
    after: afterTarget,
    versionBefore: target.version,
    versionAfter: afterTarget.version,
    editedBy,
  });

  await recordEditorHistory({
    entityType: "building",
    entityId: sourceId,
    action: "merged_into",
    before: source,
    after: {
      mergedIntoBuildingId: targetId,
      mergedIntoName: afterTarget.buildingName,
    },
    versionBefore: source.version,
    editedBy,
  });

  await Promise.all([refreshSyncKey("buildings"), refreshSyncKey("rooms")]);

  return afterTarget;
}

export async function mergeColleges({
  sourceId,
  targetId,
  sourceVersion,
  preferredName,
  editedBy = "admin",
}: EntityMergeInput): Promise<CollegeAdmin> {
  if (sourceId === targetId) {
    throw new Error("Cannot merge a college into itself.");
  }

  const [source, target] = await Promise.all([
    getCollegeById(sourceId),
    getCollegeById(targetId),
  ]);

  if (!source) throw new Error(`College ${sourceId} was not found.`);
  if (!target) throw new Error(`College ${targetId} was not found.`);

  const mergedName = pickMergedLabel(
    target.collegeName,
    source.collegeName,
    preferredName,
  );
  const unrelated = await findCollegeMergeCandidate(mergedName, sourceId);
  if (unrelated && unrelated.id !== targetId) {
    throw new DuplicateNameError("college", unrelated, mergedName);
  }

  await db.transaction(async (tx) => {
    const [lockedSource] = await tx
      .select({ id: collegesTable.id })
      .from(collegesTable)
      .where(
        and(
          eq(collegesTable.id, sourceId),
          eq(collegesTable.version, sourceVersion),
        ),
      )
      .limit(1);

    if (!lockedSource) {
      throw new EditConflictError(await getCollegeById(sourceId));
    }

    await tx
      .update(divisionsTable)
      .set({ collegeId: targetId })
      .where(eq(divisionsTable.collegeId, sourceId));

    await tx
      .update(roomsTable)
      .set({ collegeId: targetId })
      .where(eq(roomsTable.collegeId, sourceId));

    await tx
      .update(collegesTable)
      .set({
        collegeName: mergedName,
        version: sql`"version" + 1`,
        updatedAt: sql`now()`,
      })
      .where(eq(collegesTable.id, targetId));

    await tx.delete(collegesTable).where(eq(collegesTable.id, sourceId));
  });

  const afterTarget = await getCollegeById(targetId);
  if (!afterTarget) {
    throw new Error(`College ${targetId} could not be loaded after merge.`);
  }

  await recordEditorHistory({
    entityType: "college",
    entityId: targetId,
    action: "merge",
    before: target,
    after: afterTarget,
    versionBefore: target.version,
    versionAfter: afterTarget.version,
    editedBy,
  });

  await recordEditorHistory({
    entityType: "college",
    entityId: sourceId,
    action: "merged_into",
    before: source,
    after: {
      mergedIntoCollegeId: targetId,
      mergedIntoName: afterTarget.collegeName,
    },
    versionBefore: source.version,
    editedBy,
  });

  await Promise.all([
    refreshSyncKey("colleges"),
    refreshSyncKey("divisions"),
    refreshSyncKey("rooms"),
  ]);

  return afterTarget;
}

export async function mergeDivisions({
  sourceId,
  targetId,
  sourceVersion,
  preferredName,
  editedBy = "admin",
}: EntityMergeInput): Promise<DivisionAdmin> {
  if (sourceId === targetId) {
    throw new Error("Cannot merge a division into itself.");
  }

  const [source, target] = await Promise.all([
    getDivisionById(sourceId),
    getDivisionById(targetId),
  ]);

  if (!source) throw new Error(`Division ${sourceId} was not found.`);
  if (!target) throw new Error(`Division ${targetId} was not found.`);

  const mergedName = pickMergedLabel(
    target.divisionName,
    source.divisionName,
    preferredName,
  );
  const unrelated = await findDivisionMergeCandidate(mergedName, sourceId);
  if (unrelated && unrelated.id !== targetId) {
    throw new DuplicateNameError("division", unrelated, mergedName);
  }

  await db.transaction(async (tx) => {
    const [lockedSource] = await tx
      .select({ id: divisionsTable.id })
      .from(divisionsTable)
      .where(
        and(
          eq(divisionsTable.id, sourceId),
          eq(divisionsTable.version, sourceVersion),
        ),
      )
      .limit(1);

    if (!lockedSource) {
      throw new EditConflictError(await getDivisionById(sourceId));
    }

    await tx
      .update(roomsTable)
      .set({ divisionId: targetId })
      .where(eq(roomsTable.divisionId, sourceId));

    await tx
      .update(divisionsTable)
      .set({
        divisionName: mergedName,
        collegeId: target.collegeId ?? source.collegeId ?? null,
        version: sql`"version" + 1`,
        updatedAt: sql`now()`,
      })
      .where(eq(divisionsTable.id, targetId));

    await tx.delete(divisionsTable).where(eq(divisionsTable.id, sourceId));
  });

  const afterTarget = await getDivisionById(targetId);
  if (!afterTarget) {
    throw new Error(`Division ${targetId} could not be loaded after merge.`);
  }

  await recordEditorHistory({
    entityType: "division",
    entityId: targetId,
    action: "merge",
    before: target,
    after: afterTarget,
    versionBefore: target.version,
    versionAfter: afterTarget.version,
    editedBy,
  });

  await recordEditorHistory({
    entityType: "division",
    entityId: sourceId,
    action: "merged_into",
    before: source,
    after: {
      mergedIntoDivisionId: targetId,
      mergedIntoName: afterTarget.divisionName,
    },
    versionBefore: source.version,
    editedBy,
  });

  await Promise.all([refreshSyncKey("divisions"), refreshSyncKey("rooms")]);

  return afterTarget;
}

export async function mergeDorms({
  sourceId,
  targetId,
  sourceVersion,
  preferredName,
  editedBy = "admin",
}: EntityMergeInput): Promise<DormAdmin> {
  if (sourceId === targetId) {
    throw new Error("Cannot merge a dorm into itself.");
  }

  const [source, target] = await Promise.all([
    getDormById(sourceId),
    getDormById(targetId),
  ]);

  if (!source) throw new Error(`Dorm ${sourceId} was not found.`);
  if (!target) throw new Error(`Dorm ${targetId} was not found.`);

  const mergedName = pickMergedLabel(
    target.dormName,
    source.dormName,
    preferredName,
  );
  const unrelated = await findDormMergeCandidate(mergedName, sourceId);
  if (unrelated && unrelated.id !== targetId) {
    throw new DuplicateNameError("dorm", unrelated, mergedName);
  }

  await db.transaction(async (tx) => {
    const [lockedSource] = await tx
      .select({ id: dormsTable.id })
      .from(dormsTable)
      .where(
        and(eq(dormsTable.id, sourceId), eq(dormsTable.version, sourceVersion)),
      )
      .limit(1);

    if (!lockedSource) {
      throw new EditConflictError(await getDormById(sourceId));
    }

    await tx
      .update(eventLocationsTable)
      .set({ dormId: targetId })
      .where(eq(eventLocationsTable.dormId, sourceId));

    await tx
      .update(dormsTable)
      .set({
        dormName: mergedName,
        shortName: target.shortName?.trim()
          ? target.shortName
          : source.shortName,
        lat: target.lat ?? source.lat,
        lon: target.lon ?? source.lon,
        gender: target.gender?.trim() ? target.gender : source.gender,
        capacity: target.capacity ?? source.capacity,
        managingOffice: pickNullableText(
          target.managingOffice,
          source.managingOffice,
        ),
        contactEmail: pickNullableText(
          target.contactEmail,
          source.contactEmail,
        ),
        amenities:
          target.amenities && target.amenities.length > 0
            ? target.amenities
            : source.amenities,
        osmLink: pickNullableText(target.osmLink, source.osmLink),
        description: pickNullableText(target.description, source.description),
        isUpManaged: target.isUpManaged ?? source.isUpManaged,
        priceRange: pickNullableText(target.priceRange, source.priceRange),
        contactPhone:
          target.contactPhone && target.contactPhone.length > 0
            ? target.contactPhone
            : source.contactPhone,
        facebookLink: pickNullableText(
          target.facebookLink,
          source.facebookLink,
        ),
        version: sql`"version" + 1`,
        updatedAt: sql`now()`,
      })
      .where(eq(dormsTable.id, targetId));

    await tx.delete(dormsTable).where(eq(dormsTable.id, sourceId));
  });

  const afterTarget = await getDormById(targetId);
  if (!afterTarget) {
    throw new Error(`Dorm ${targetId} could not be loaded after merge.`);
  }

  await recordEditorHistory({
    entityType: "dorm",
    entityId: targetId,
    action: "merge",
    before: target,
    after: afterTarget,
    versionBefore: target.version,
    versionAfter: afterTarget.version,
    editedBy,
  });

  await recordEditorHistory({
    entityType: "dorm",
    entityId: sourceId,
    action: "merged_into",
    before: source,
    after: {
      mergedIntoDormId: targetId,
      mergedIntoName: afterTarget.dormName,
    },
    versionBefore: source.version,
    editedBy,
  });

  await refreshSyncKey("dorms");

  return afterTarget;
}
