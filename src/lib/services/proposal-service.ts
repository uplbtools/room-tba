import { and, desc, eq, inArray, sql } from "drizzle-orm";
import {
  buildingsTable,
  collegesTable,
  divisionsTable,
  dormsTable,
  editProposalsTable,
  eventsTable,
  roomsTable,
} from "@drizzle/schema";
import { db } from "@lib/db";
import { validateSubmitterName } from "@constants/proposals";
import { type SessionUser } from "@lib/admin/auth";
import { recordProposalContribution } from "./contribution-service";
import { parseEventImageUrl } from "@lib/r2-upload";
import { R2_PUBLIC_URL } from "astro:env/server";
import {
  canViewProposalSubmitterDetails,
  canWithdrawProposal,
} from "./proposal-access";
export {
  canViewProposalSubmitterDetails,
  canWithdrawProposal,
} from "./proposal-access";
import {
  EditConflictError,
  DuplicateSlugError,
  createBuilding,
  createCollege,
  createDivision,
  createDorm,
  createEvent,
  createRoom,
  updateBuilding,
  updateCollege,
  updateDivision,
  updateDorm,
  updateEvent,
  updateEventLocations,
  updateRoom,
  type BuildingUpdateInput,
  type DormCreateInput,
  type DormUpdateInput,
  type DivisionUpdateInput,
  type EventLocationWriteInput,
  type EventWriteInput,
  type RoomCreateInput,
  type RoomUpdateInput,
} from "./admin-service";
import { allowEntityScopedProposalMerge } from "@lib/proposals/proposal-merge-policy";
import {
  ProposalValidationError,
  parseBundledRooms,
  validateCreateProposalPatch,
} from "@lib/proposals/create-proposal-validation";

export const PROPOSAL_UPDATE_TYPES = [
  "building",
  "dorm",
  "room",
  "college",
  "division",
  "event",
  "event_locations",
] as const;

export const PROPOSAL_CREATE_TYPES = [
  "create_building",
  "create_event",
  "create_dorm",
  "create_room",
  "create_college",
  "create_division",
] as const;

export const PROPOSAL_ENTITY_TYPES = [
  ...PROPOSAL_UPDATE_TYPES,
  ...PROPOSAL_CREATE_TYPES,
] as const;

export type ProposalUpdateType = (typeof PROPOSAL_UPDATE_TYPES)[number];
export type ProposalCreateType = (typeof PROPOSAL_CREATE_TYPES)[number];
export type ProposalEntityType = (typeof PROPOSAL_ENTITY_TYPES)[number];

export function isCreateProposalType(
  value: string,
): value is ProposalCreateType {
  return (PROPOSAL_CREATE_TYPES as readonly string[]).includes(value);
}

export function isUpdateProposalType(
  value: string,
): value is ProposalUpdateType {
  return (PROPOSAL_UPDATE_TYPES as readonly string[]).includes(value);
}

export type EditProposalRow = typeof editProposalsTable.$inferSelect;

export type EditProposalSummary = EditProposalRow & {
  entityLabel: string;
};

function isProposalEntityType(value: string): value is ProposalEntityType {
  return (PROPOSAL_ENTITY_TYPES as readonly string[]).includes(value);
}

export async function getEntityLabel(
  entityType: ProposalEntityType,
  entityId: number,
  patch?: Record<string, unknown>,
): Promise<string> {
  if (isCreateProposalType(entityType)) {
    const p = patch ?? {};
    switch (entityType) {
      case "create_building": {
        const name =
          typeof p.buildingName === "string" && p.buildingName.trim()
            ? p.buildingName.trim()
            : null;
        const rooms = parseBundledRooms(p);
        if (name && rooms.length > 0) {
          return `New building: ${name} (+ ${rooms.length} room${rooms.length === 1 ? "" : "s"})`;
        }
        return name ? `New building: ${name}` : "New building";
      }
      case "create_event":
        return typeof p.title === "string" && p.title.trim()
          ? `New event: ${p.title.trim()}`
          : "New event";
      case "create_dorm":
        return typeof p.dormName === "string" && p.dormName.trim()
          ? `New dorm: ${p.dormName.trim()}`
          : "New dorm";
      case "create_room": {
        const code =
          typeof p.roomCode === "string" && p.roomCode.trim()
            ? p.roomCode.trim()
            : null;
        const buildingId = Number(p.buildingId);
        if (code && Number.isInteger(buildingId) && buildingId >= 1) {
          const [row] = await db
            .select({ label: buildingsTable.buildingName })
            .from(buildingsTable)
            .where(eq(buildingsTable.id, buildingId))
            .limit(1);
          if (row?.label) {
            return `New room: ${code} (${row.label})`;
          }
        }
        return code ? `New room: ${code}` : "New room";
      }
      case "create_college":
        return typeof p.collegeName === "string" && p.collegeName.trim()
          ? `New college: ${p.collegeName.trim()}`
          : "New college";
      case "create_division":
        return typeof p.divisionName === "string" && p.divisionName.trim()
          ? `New division: ${p.divisionName.trim()}`
          : "New division";
    }
  }

  switch (entityType) {
    case "building": {
      const [row] = await db
        .select({ label: buildingsTable.buildingName })
        .from(buildingsTable)
        .where(eq(buildingsTable.id, entityId))
        .limit(1);
      return row?.label ?? `Building #${entityId}`;
    }
    case "dorm": {
      const [row] = await db
        .select({ label: dormsTable.dormName })
        .from(dormsTable)
        .where(eq(dormsTable.id, entityId))
        .limit(1);
      return row?.label ?? `Dorm #${entityId}`;
    }
    case "room": {
      const [row] = await db
        .select({ label: roomsTable.roomCode })
        .from(roomsTable)
        .where(eq(roomsTable.id, entityId))
        .limit(1);
      return row?.label ?? `Room #${entityId}`;
    }
    case "college": {
      const [row] = await db
        .select({ label: collegesTable.collegeName })
        .from(collegesTable)
        .where(eq(collegesTable.id, entityId))
        .limit(1);
      return row?.label ?? `College #${entityId}`;
    }
    case "division": {
      const [row] = await db
        .select({ label: divisionsTable.divisionName })
        .from(divisionsTable)
        .where(eq(divisionsTable.id, entityId))
        .limit(1);
      return row?.label ?? `Division #${entityId}`;
    }
    case "event":
    case "event_locations": {
      const [row] = await db
        .select({ label: eventsTable.title })
        .from(eventsTable)
        .where(eq(eventsTable.id, entityId))
        .limit(1);
      return row?.label ?? `Event #${entityId}`;
    }
  }
}

async function entityExists(
  entityType: ProposalUpdateType,
  entityId: number,
): Promise<boolean> {
  switch (entityType) {
    case "building": {
      const [row] = await db
        .select({ id: buildingsTable.id })
        .from(buildingsTable)
        .where(eq(buildingsTable.id, entityId))
        .limit(1);
      return row !== undefined;
    }
    case "dorm": {
      const [row] = await db
        .select({ id: dormsTable.id })
        .from(dormsTable)
        .where(eq(dormsTable.id, entityId))
        .limit(1);
      return row !== undefined;
    }
    case "room": {
      const [row] = await db
        .select({ id: roomsTable.id })
        .from(roomsTable)
        .where(eq(roomsTable.id, entityId))
        .limit(1);
      return row !== undefined;
    }
    case "college": {
      const [row] = await db
        .select({ id: collegesTable.id })
        .from(collegesTable)
        .where(eq(collegesTable.id, entityId))
        .limit(1);
      return row !== undefined;
    }
    case "division": {
      const [row] = await db
        .select({ id: divisionsTable.id })
        .from(divisionsTable)
        .where(eq(divisionsTable.id, entityId))
        .limit(1);
      return row !== undefined;
    }
    case "event":
    case "event_locations": {
      const [row] = await db
        .select({ id: eventsTable.id })
        .from(eventsTable)
        .where(eq(eventsTable.id, entityId))
        .limit(1);
      return row !== undefined;
    }
  }
}

export type ProposalPublicView = {
  id: number;
  entityType: string;
  entityId: number;
  entityLabel: string;
  status: string;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProposalSubmitterView = ProposalPublicView & {
  proposedPatch: Record<string, unknown>;
  baseVersion: number;
  submitterName: string;
};

export function toPublicProposalView(
  summary: EditProposalSummary,
): ProposalPublicView {
  const showNote =
    summary.status === "needs_changes" || summary.status === "rejected";
  return {
    id: summary.id,
    entityType: summary.entityType,
    entityId: summary.entityId,
    entityLabel: summary.entityLabel,
    status: summary.status,
    adminNote: showNote ? summary.adminNote : null,
    createdAt: summary.createdAt,
    updatedAt: summary.updatedAt,
  };
}

export function toSubmitterProposalView(
  summary: EditProposalSummary,
): ProposalSubmitterView {
  return {
    ...toPublicProposalView(summary),
    proposedPatch: summary.proposedPatch as Record<string, unknown>,
    baseVersion: summary.baseVersion,
    submitterName: summary.submitterName,
  };
}
export async function withEntityLabel(
  row: EditProposalRow,
): Promise<EditProposalSummary> {
  return {
    ...row,
    entityLabel: await getEntityLabel(
      row.entityType as ProposalEntityType,
      row.entityId,
      row.proposedPatch as Record<string, unknown>,
    ),
  };
}

export async function listPendingProposals(): Promise<EditProposalSummary[]> {
  const rows = await db
    .select()
    .from(editProposalsTable)
    .where(
      inArray(editProposalsTable.status, ["pending", "needs_changes"] as const),
    )
    .orderBy(desc(editProposalsTable.createdAt));

  return Promise.all(rows.map(withEntityLabel));
}

export async function countPendingProposals(): Promise<number> {
  const rows = await db
    .select({ c: sql<number>`count(*)` })
    .from(editProposalsTable)
    .where(
      inArray(editProposalsTable.status, ["pending", "needs_changes"] as const),
    );
  return Number(rows[0]?.c ?? 0);
}

export async function getProposalById(
  id: number,
): Promise<EditProposalSummary | null> {
  const [row] = await db
    .select()
    .from(editProposalsTable)
    .where(eq(editProposalsTable.id, id))
    .limit(1);
  if (!row) return null;
  return withEntityLabel(row);
}

type SubmitProposalInput = {
  entityType: string;
  entityId: number;
  baseVersion: number;
  patch: Record<string, unknown>;
  submitterName: string;
  submitterUserId?: number | null;
  proposalId?: number | null;
};

export async function submitProposal(
  input: SubmitProposalInput,
): Promise<EditProposalSummary> {
  if (!isProposalEntityType(input.entityType)) {
    throw new ProposalValidationError("Unsupported entity type.");
  }
  const isCreate = isCreateProposalType(input.entityType);
  if (isCreate) {
    if (input.entityId !== 0) {
      throw new ProposalValidationError("Invalid entity ID for a new entry.");
    }
    if (input.baseVersion !== 0) {
      throw new ProposalValidationError(
        "Invalid base version for a new entry.",
      );
    }
  } else {
    if (!Number.isInteger(input.entityId) || input.entityId < 1) {
      throw new ProposalValidationError("Invalid entity ID.");
    }
    if (!Number.isInteger(input.baseVersion) || input.baseVersion < 1) {
      throw new ProposalValidationError("Invalid base version.");
    }
  }
  const validation = validateSubmitterName(input.submitterName);
  if (!validation.ok) {
    throw new ProposalValidationError(validation.error);
  }
  const name = validation.name;
  if (Object.keys(input.patch).length === 0) {
    throw new ProposalValidationError("No changes to submit.");
  }

  if (
    !isCreate &&
    !(await entityExists(
      input.entityType as ProposalUpdateType,
      input.entityId,
    ))
  ) {
    throw new ProposalValidationError("Entity not found.");
  }

  let existing: EditProposalRow | undefined;

  if (input.proposalId) {
    [existing] = await db
      .select()
      .from(editProposalsTable)
      .where(eq(editProposalsTable.id, input.proposalId))
      .limit(1);
    if (
      !existing ||
      !["pending", "needs_changes"].includes(existing.status) ||
      existing.submitterName !== name ||
      (input.submitterUserId &&
        existing.submitterUserId !== input.submitterUserId)
    ) {
      existing = undefined;
    }
  } else if (allowEntityScopedProposalMerge(isCreate, input.submitterUserId)) {
    [existing] = await db
      .select()
      .from(editProposalsTable)
      .where(
        and(
          eq(editProposalsTable.entityType, input.entityType),
          eq(editProposalsTable.entityId, input.entityId),
          eq(editProposalsTable.submitterUserId, input.submitterUserId),
          inArray(editProposalsTable.status, [
            "pending",
            "needs_changes",
          ] as const),
        ),
      )
      .limit(1);
  }

  const mergedPatch = existing
    ? {
        ...(existing.proposedPatch as Record<string, unknown>),
        ...input.patch,
      }
    : input.patch;

  if (isCreate) {
    validateCreateProposalPatch(input.entityType, mergedPatch);
    if (input.entityType === "create_room") {
      const buildingId = Number(mergedPatch.buildingId);
      const [row] = await db
        .select({ id: buildingsTable.id })
        .from(buildingsTable)
        .where(eq(buildingsTable.id, buildingId))
        .limit(1);
      if (!row) {
        throw new ProposalValidationError(
          "That building is not on the map yet. Wait for editors to approve your building suggestion, or pick a building that already exists.",
        );
      }
    }
  }

  if (existing) {
    const [updated] = await db
      .update(editProposalsTable)
      .set({
        proposedPatch: mergedPatch,
        baseVersion: input.baseVersion,
        status: "pending",
        adminNote: null,
        reviewedBy: null,
        reviewedAt: null,
        updatedAt: sql`now()`,
      })
      .where(eq(editProposalsTable.id, existing.id))
      .returning();
    if (!updated) throw new Error("Failed to update proposal.");
    return withEntityLabel(updated);
  }

  const [created] = await db
    .insert(editProposalsTable)
    .values({
      entityType: input.entityType,
      entityId: input.entityId,
      proposedPatch: mergedPatch,
      baseVersion: input.baseVersion,
      submitterName: name,
      submitterUserId: input.submitterUserId ?? null,
      status: "pending",
    })
    .returning();

  if (!created) throw new Error("Failed to create proposal.");
  return withEntityLabel(created);
}

export {
  ProposalValidationError,
  parseBundledRooms,
  validateBundledRooms,
  type BundledRoomDraft,
} from "@lib/proposals/create-proposal-validation";

export class ProposalActionError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "ProposalActionError";
    this.status = status;
  }
}

function validateProposalEventImageUrl(patch: Record<string, unknown>) {
  if (!("imageUrl" in patch)) return;
  const parsed = parseEventImageUrl(patch.imageUrl, R2_PUBLIC_URL);
  if (!parsed.ok) {
    throw new ProposalActionError(parsed.error);
  }
  if (parsed.provided) {
    patch.imageUrl = parsed.imageUrl;
  }
}

async function applyProposalPatch(proposal: EditProposalRow, editedBy: string) {
  const patch = proposal.proposedPatch as Record<string, unknown>;
  const entityType = proposal.entityType as ProposalEntityType;

  if (entityType === "create_event" || entityType === "event") {
    validateProposalEventImageUrl(patch);
  }

  if (isCreateProposalType(entityType)) {
    switch (entityType) {
      case "create_building": {
        const rooms = parseBundledRooms(patch);
        const building = await createBuilding(
          {
            buildingName:
              typeof patch.buildingName === "string" ? patch.buildingName : "",
            directions:
              typeof patch.directions === "string" ? patch.directions : "",
            buildingType:
              patch.buildingType === "admin" ? "admin" : "non-admin",
            lat: patch.lat as number,
            lon: patch.lon as number,
          },
          editedBy,
        );
        if (!building) {
          throw new ProposalActionError("Failed to create building.", 500);
        }
        for (const room of rooms) {
          await createRoom(
            {
              roomCode: room.roomCode,
              directions: room.directions || null,
              buildingId: building.id,
            },
            editedBy,
          );
        }
        return building;
      }
      case "create_college": {
        const collegeName =
          typeof patch.collegeName === "string" ? patch.collegeName : "";
        return createCollege(collegeName, editedBy);
      }
      case "create_division": {
        const divisionName =
          typeof patch.divisionName === "string" ? patch.divisionName : "";
        const collegeId =
          patch.collegeId === null || patch.collegeId === undefined
            ? null
            : Number(patch.collegeId);
        return createDivision(
          {
            divisionName,
            collegeId: Number.isInteger(collegeId) ? collegeId : null,
          },
          editedBy,
        );
      }
      case "create_dorm":
        return createDorm(patch as DormCreateInput, editedBy);
      case "create_room":
        return createRoom(patch as RoomCreateInput, editedBy);
      case "create_event":
        return createEvent(patch as EventWriteInput, editedBy);
    }
  }

  const version = proposal.baseVersion;

  switch (entityType) {
    case "building":
      return updateBuilding(
        proposal.entityId,
        patch as BuildingUpdateInput,
        version,
        editedBy,
      );
    case "dorm":
      return updateDorm(
        proposal.entityId,
        patch as DormUpdateInput,
        version,
        editedBy,
      );
    case "room":
      return updateRoom(
        proposal.entityId,
        patch as RoomUpdateInput,
        version,
        editedBy,
      );
    case "college": {
      const name =
        typeof patch.collegeName === "string" ? patch.collegeName : "";
      return updateCollege(proposal.entityId, name, version, editedBy);
    }
    case "division": {
      const updates: DivisionUpdateInput = {};
      if (typeof patch.divisionName === "string") {
        updates.divisionName = patch.divisionName;
      }
      if (patch.collegeId !== undefined) {
        updates.collegeId =
          patch.collegeId === null ? null : Number(patch.collegeId);
      }
      return updateDivision(proposal.entityId, updates, version, editedBy);
    }
    case "event":
      return updateEvent(
        proposal.entityId,
        patch as EventWriteInput,
        version,
        editedBy,
      );
    case "event_locations": {
      const locations = patch.locations;
      if (!Array.isArray(locations)) {
        throw new ProposalActionError("Invalid event locations proposal.");
      }
      return updateEventLocations(
        proposal.entityId,
        locations as EventLocationWriteInput[],
        version,
        editedBy,
      );
    }
    default:
      throw new ProposalActionError("Unsupported entity type.");
  }
}

async function finalizeProposal(
  id: number,
  status: "approved" | "rejected" | "needs_changes",
  reviewedBy: string,
  adminNote?: string | null,
) {
  const [updated] = await db
    .update(editProposalsTable)
    .set({
      status,
      reviewedBy,
      reviewedAt: sql`now()`,
      adminNote: adminNote?.trim() || null,
      updatedAt: sql`now()`,
    })
    .where(eq(editProposalsTable.id, id))
    .returning();
  return updated ?? null;
}

export async function approveProposal(id: number, reviewer: SessionUser) {
  const proposal = await getProposalById(id);
  if (!proposal) throw new ProposalActionError("Proposal not found.", 404);
  if (!["pending", "needs_changes"].includes(proposal.status)) {
    throw new ProposalActionError("This proposal is no longer open.", 409);
  }

  const reviewedBy = reviewer.displayName || reviewer.username;
  const priorStatus = proposal.status;
  const priorNote = proposal.adminNote;

  const [claimed] = await db
    .update(editProposalsTable)
    .set({
      status: "approved",
      reviewedBy,
      reviewedAt: sql`now()`,
      adminNote: null,
      updatedAt: sql`now()`,
    })
    .where(
      and(
        eq(editProposalsTable.id, id),
        inArray(editProposalsTable.status, [
          "pending",
          "needs_changes",
        ] as const),
      ),
    )
    .returning();

  if (!claimed) {
    throw new ProposalActionError("This proposal is no longer open.", 409);
  }

  try {
    const published = await applyProposalPatch(claimed, reviewedBy);
    const proposal = await withEntityLabel(claimed);
    await recordProposalContribution(proposal);
    return { proposal, published };
  } catch (err) {
    await db
      .update(editProposalsTable)
      .set({
        status: priorStatus,
        reviewedBy: null,
        reviewedAt: null,
        adminNote: priorNote,
        updatedAt: sql`now()`,
      })
      .where(eq(editProposalsTable.id, id));

    if (err instanceof EditConflictError) {
      throw new ProposalActionError(
        "Published data changed before approval. Refresh and review again.",
        409,
      );
    }
    if (err instanceof DuplicateSlugError) {
      throw new ProposalActionError(err.message, 409);
    }
    throw err;
  }
}

export async function rejectProposal(
  id: number,
  reviewer: SessionUser,
  note?: string,
) {
  const proposal = await getProposalById(id);
  if (!proposal) throw new ProposalActionError("Proposal not found.", 404);
  if (!["pending", "needs_changes"].includes(proposal.status)) {
    throw new ProposalActionError("This proposal is no longer open.", 409);
  }
  const finalized = await finalizeProposal(
    id,
    "rejected",
    reviewer.displayName || reviewer.username,
    note,
  );
  if (!finalized) throw new ProposalActionError("Proposal not found.", 404);
  return withEntityLabel(finalized);
}

export async function requestProposalChanges(
  id: number,
  reviewer: SessionUser,
  note?: string,
) {
  const proposal = await getProposalById(id);
  if (!proposal) throw new ProposalActionError("Proposal not found.", 404);
  if (!["pending", "needs_changes"].includes(proposal.status)) {
    throw new ProposalActionError("This proposal is no longer open.", 409);
  }
  if (!note?.trim()) {
    throw new ProposalValidationError(
      "Add a note so the contributor knows what to change.",
    );
  }
  const finalized = await finalizeProposal(
    id,
    "needs_changes",
    reviewer.displayName || reviewer.username,
    note,
  );
  if (!finalized) throw new ProposalActionError("Proposal not found.", 404);
  return withEntityLabel(finalized);
}

export async function withdrawProposal(
  id: number,
  session: SessionUser | null,
  submitterName?: string,
) {
  const proposal = await getProposalById(id);
  if (!proposal) throw new ProposalActionError("Proposal not found.", 404);
  if (!canWithdrawProposal(session, proposal, submitterName)) {
    throw new ProposalActionError(
      "Not allowed to withdraw this proposal.",
      403,
    );
  }

  const withdrawnBy =
    session?.displayName || session?.username || proposal.submitterName;

  const [updated] = await db
    .update(editProposalsTable)
    .set({
      status: "withdrawn",
      reviewedBy: withdrawnBy,
      reviewedAt: sql`now()`,
      adminNote: null,
      updatedAt: sql`now()`,
    })
    .where(
      and(
        eq(editProposalsTable.id, id),
        inArray(editProposalsTable.status, [
          "pending",
          "needs_changes",
        ] as const),
      ),
    )
    .returning();

  if (!updated) {
    throw new ProposalActionError("This proposal is no longer open.", 409);
  }
  return withEntityLabel(updated);
}
