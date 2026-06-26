import { and, eq, sql } from "drizzle-orm";
import { classesTable, roomsTable, roomPositionsTable } from "@drizzle/schema";
import { normalizeEntityName } from "../entity-names";
import { db } from "@lib/db";
import type { RoomData } from "@lib/types";
import {
  EditConflictError,
  DuplicateNameError,
  findRoomMergeCandidate,
  getRoomById,
  getRoomPosition,
  recordEditorHistory,
  refreshSyncKey,
} from "./admin-service";

export type RoomMergeInput = {
  sourceId: number;
  targetId: number;
  sourceVersion: number;
  preferredRoomCode?: string;
  editedBy?: string;
};

function pickMergedRoomCode(
  target: RoomData,
  source: RoomData,
  preferredRoomCode?: string,
): string {
  if (preferredRoomCode?.trim()) return preferredRoomCode.trim();
  if (target.code.trim()) return target.code.trim();
  return source.code.trim();
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

  const mergedCode = pickMergedRoomCode(target, source, preferredRoomCode);
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
        directions: target.directions?.trim()
          ? target.directions
          : source.directions?.trim() || null,
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
