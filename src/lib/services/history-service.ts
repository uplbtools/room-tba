import { and, desc, eq } from "drizzle-orm";
import { editorHistoryTable } from "@drizzle/schema";
import { db } from "@lib/db";
import {
  updateBuilding,
  updateCollege,
  updateDivision,
  updateDorm,
  updateEvent,
  updateRoom,
  type BuildingUpdateInput,
  type DivisionUpdateInput,
  type DormUpdateInput,
  type EventWriteInput,
  type RoomUpdateInput,
} from "./admin-service";

export type HistoryEntry = typeof editorHistoryTable.$inferSelect;

export class HistoryRevertError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "HistoryRevertError";
    this.status = status;
  }
}

export async function getEntityHistory(
  entityType: string,
  entityId: number,
  { limit = 20, offset = 0 }: { limit?: number; offset?: number } = {},
): Promise<HistoryEntry[]> {
  return db
    .select()
    .from(editorHistoryTable)
    .where(
      and(
        eq(editorHistoryTable.entityType, entityType),
        eq(editorHistoryTable.entityId, entityId),
      ),
    )
    .orderBy(desc(editorHistoryTable.createdAt), desc(editorHistoryTable.id))
    .limit(Math.min(limit, 50))
    .offset(offset);
}

// Fields that can be restored from a snapshot. Anything else in the snapshot
// (id, version, updatedAt, joined labels) must never be written back.
const REVERTABLE_FIELDS: Record<string, string[]> = {
  building: [
    "buildingName",
    "lat",
    "lon",
    "buildingType",
    "directions",
    "imageUrl",
  ],
  room: [
    "roomCode",
    "directions",
    "buildingId",
    "collegeId",
    "divisionId",
    "imageUrl",
  ],
  college: ["collegeName"],
  division: ["divisionName", "collegeId"],
  dorm: [
    "dormName",
    "shortName",
    "lat",
    "lon",
    "gender",
    "capacity",
    "managingOffice",
    "contactEmail",
    "amenities",
    "osmLink",
    "description",
    "isUpManaged",
    "priceRange",
    "contactPhone",
    "facebookLink",
    "imageUrl",
  ],
  // Scalar fields only; locations/routes restore is out of scope for v1.
  event: [
    "title",
    "description",
    "category",
    "startsAt",
    "endsAt",
    "timezone",
    "recurrence",
    "isActive",
    "sourceUrl",
    "imageUrl",
    "priority",
  ],
};

function pickRevertInput(
  entityType: string,
  snapshot: Record<string, unknown>,
): Record<string, unknown> {
  const fields = REVERTABLE_FIELDS[entityType];
  if (!fields) {
    throw new HistoryRevertError(
      `History restore is not supported for ${entityType} entries.`,
    );
  }
  return Object.fromEntries(
    fields.filter((key) => key in snapshot).map((key) => [key, snapshot[key]]),
  );
}

/**
 * Restore the state captured in a history entry's after-snapshot as a new
 * write. Routes through the existing update functions so duplicate-name
 * checks, optimistic locking (EditConflictError -> 409), history recording,
 * and sync-key refresh all apply. The new history row has action "revert".
 */
export async function revertToHistoryEntry({
  historyId,
  expectedVersion,
  editedBy,
  summary,
}: {
  historyId: number;
  expectedVersion: number;
  editedBy: string;
  summary: string;
}): Promise<unknown> {
  const [entry] = await db
    .select()
    .from(editorHistoryTable)
    .where(eq(editorHistoryTable.id, historyId))
    .limit(1);
  if (!entry) {
    throw new HistoryRevertError("History entry not found.", 404);
  }
  const snapshot = (entry.after ?? null) as Record<string, unknown> | null;
  if (!snapshot) {
    throw new HistoryRevertError(
      "This entry has no restorable snapshot (deleted entries cannot be restored yet).",
    );
  }

  const history = { action: "revert", summary };
  const input = pickRevertInput(entry.entityType, snapshot);
  // Room snapshots come from getRoomById (RoomData), which exposes the room
  // code as `code`, not `roomCode` — map it or code changes never restore.
  if (
    entry.entityType === "room" &&
    input.roomCode === undefined &&
    typeof snapshot.code === "string"
  ) {
    input.roomCode = snapshot.code;
  }
  if (Object.keys(input).length === 0) {
    throw new HistoryRevertError("Nothing restorable in this snapshot.");
  }

  switch (entry.entityType) {
    case "building":
      return updateBuilding(
        entry.entityId,
        input as BuildingUpdateInput,
        expectedVersion,
        editedBy,
        history,
      );
    case "room":
      return updateRoom(
        entry.entityId,
        input as RoomUpdateInput,
        expectedVersion,
        editedBy,
        history,
      );
    case "college":
      return updateCollege(
        entry.entityId,
        String(input.collegeName ?? ""),
        expectedVersion,
        editedBy,
        history,
      );
    case "division":
      return updateDivision(
        entry.entityId,
        input as DivisionUpdateInput,
        expectedVersion,
        editedBy,
        history,
      );
    case "dorm":
      return updateDorm(
        entry.entityId,
        input as DormUpdateInput,
        expectedVersion,
        editedBy,
        history,
      );
    case "event":
      return updateEvent(
        entry.entityId,
        input as EventWriteInput,
        expectedVersion,
        editedBy,
        history,
      );
    default:
      throw new HistoryRevertError(
        `History restore is not supported for ${entry.entityType} entries.`,
      );
  }
}
