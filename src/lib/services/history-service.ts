import { and, asc, desc, eq, gte, inArray, or } from "drizzle-orm";
import {
  adminUsersTable,
  contributionsTable,
  editorHistoryTable,
} from "@drizzle/schema";
import { db } from "@lib/db";
import {
  rowAuthor,
  toIsoTimestamp,
  toPublicHistoryEntry,
  type EditorAccount,
  type EntityAttribution,
  type ProposalCredit,
  type PublicHistoryEntry,
} from "@lib/editor/entity-attribution";
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

/** Approved-proposal credits that could belong to these history rows. */
async function loadProposalCredits(
  entityType: string,
  entityId: number,
  rows: HistoryEntry[],
): Promise<ProposalCredit[]> {
  const oldest = rows.reduce(
    (min, row) => (row.createdAt < min ? row.createdAt : min),
    rows[0]?.createdAt ?? "",
  );
  if (!oldest) return [];
  return db
    .select({
      entityType: contributionsTable.entityType,
      submitterName: contributionsTable.submitterName,
      createdAt: contributionsTable.createdAt,
    })
    .from(contributionsTable)
    .where(
      and(
        eq(contributionsTable.source, "proposal_approved"),
        gte(contributionsTable.createdAt, oldest),
        or(
          and(
            eq(contributionsTable.entityType, entityType),
            eq(contributionsTable.entityId, entityId),
          ),
          and(
            eq(contributionsTable.entityType, `create_${entityType}`),
            eq(contributionsTable.entityId, 0),
          ),
        ),
      ),
    );
}

async function loadEditorAccounts(
  rows: HistoryEntry[],
): Promise<EditorAccount[]> {
  const actors = [...new Set(rows.map((row) => row.editedBy))];
  if (actors.length === 0) return [];
  return db
    .select({
      username: adminUsersTable.username,
      displayName: adminUsersTable.displayName,
      showInCredits: adminUsersTable.showInCredits,
    })
    .from(adminUsersTable)
    .where(
      or(
        inArray(adminUsersTable.username, actors),
        inArray(adminUsersTable.displayName, actors),
      ),
    );
}

export const PUBLIC_HISTORY_PAGE_SIZE = 50;

/**
 * Read-only history for visitors. Only whitelisted card fields and public
 * names leave the server; see toPublicHistoryEntry.
 */
export async function getPublicEntityHistory(
  entityType: string,
  entityId: number,
  offset = 0,
): Promise<{ entries: PublicHistoryEntry[]; nextOffset: number | null }> {
  const rows = await getEntityHistory(entityType, entityId, {
    limit: PUBLIC_HISTORY_PAGE_SIZE,
    offset,
  });
  const [credits, accounts] = await Promise.all([
    loadProposalCredits(entityType, entityId, rows),
    loadEditorAccounts(rows),
  ]);
  return {
    entries: rows
      .map((row) => toPublicHistoryEntry(row, credits, accounts))
      .filter((entry): entry is PublicHistoryEntry => entry !== null),
    nextOffset:
      rows.length === PUBLIC_HISTORY_PAGE_SIZE
        ? offset + PUBLIC_HISTORY_PAGE_SIZE
        : null,
  };
}

/** Who added an entity and who last edited it, as public names. */
export async function getEntityAttribution(
  entityType: string,
  entityId: number,
): Promise<EntityAttribution | null> {
  const [[latest], [created]] = await Promise.all([
    getEntityHistory(entityType, entityId, { limit: 1 }),
    db
      .select()
      .from(editorHistoryTable)
      .where(
        and(
          eq(editorHistoryTable.entityType, entityType),
          eq(editorHistoryTable.entityId, entityId),
          eq(editorHistoryTable.action, "create"),
        ),
      )
      .orderBy(asc(editorHistoryTable.createdAt))
      .limit(1),
  ]);
  if (!latest) return null;
  const rows = created ? [created, latest] : [latest];
  const [credits, accounts] = await Promise.all([
    loadProposalCredits(entityType, entityId, rows),
    loadEditorAccounts(rows),
  ]);
  const edited = latest.id === created?.id ? null : latest;
  return {
    addedBy: created ? rowAuthor(created, credits, accounts) : null,
    addedAt: created ? toIsoTimestamp(created.createdAt) : null,
    lastEditedBy: edited ? rowAuthor(edited, credits, accounts) : null,
    lastEditedAt: edited ? toIsoTimestamp(edited.createdAt) : null,
  };
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
