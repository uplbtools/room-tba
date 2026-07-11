import type { ProposalCreateType } from "@lib/services/proposal-service";
import { ORG_CATEGORIES, type OrgCategory } from "@constants/org-categories";
import { normalizePlaceCategory } from "@constants/place-categories";

export type BundledRoomDraft = {
  roomCode: string;
  directions: string;
};

export function parseBundledRooms(
  patch: Record<string, unknown>,
): BundledRoomDraft[] {
  if (!Array.isArray(patch.rooms)) return [];
  const rooms: BundledRoomDraft[] = [];
  for (const entry of patch.rooms) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    const roomCode =
      typeof row.roomCode === "string" ? row.roomCode.trim() : "";
    if (!roomCode) continue;
    const directions =
      typeof row.directions === "string" ? row.directions.trim() : "";
    rooms.push({ roomCode, directions });
  }
  return rooms;
}

export function validateBundledRooms(
  rooms: BundledRoomDraft[],
  maxRooms = 20,
): void {
  if (rooms.length > maxRooms) {
    throw new ProposalValidationError(
      `Add at most ${maxRooms} rooms in one building suggestion.`,
    );
  }
  const codes = new Set<string>();
  for (const room of rooms) {
    const key = room.roomCode.toLowerCase();
    if (codes.has(key)) {
      throw new ProposalValidationError(
        `Duplicate room code in this suggestion: ${room.roomCode}`,
      );
    }
    codes.add(key);
  }
}

export class ProposalValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProposalValidationError";
  }
}

export function validateCreateProposalPatch(
  entityType: ProposalCreateType,
  patch: Record<string, unknown>,
): void {
  switch (entityType) {
    case "create_building": {
      const name =
        typeof patch.buildingName === "string" ? patch.buildingName.trim() : "";
      if (!name)
        throw new ProposalValidationError("Building name is required.");
      if (typeof patch.lat !== "number" || typeof patch.lon !== "number") {
        throw new ProposalValidationError(
          "Pick a map location for the new building.",
        );
      }
      validateBundledRooms(parseBundledRooms(patch));
      return;
    }
    case "create_event": {
      const title = typeof patch.title === "string" ? patch.title.trim() : "";
      if (!title) throw new ProposalValidationError("Event title is required.");
      if (
        typeof patch.startsAt !== "string" ||
        typeof patch.endsAt !== "string"
      ) {
        throw new ProposalValidationError("Event start and end are required.");
      }
      return;
    }
    case "create_dorm": {
      const name =
        typeof patch.dormName === "string" ? patch.dormName.trim() : "";
      const gender =
        typeof patch.gender === "string" ? patch.gender.trim() : "";
      if (!name) throw new ProposalValidationError("Dorm name is required.");
      if (!gender)
        throw new ProposalValidationError("Dorm gender is required.");
      return;
    }
    case "create_place": {
      const name = typeof patch.name === "string" ? patch.name.trim() : "";
      const category = normalizePlaceCategory(patch.category);
      if (!name) throw new ProposalValidationError("Place name is required.");
      if (!category) {
        throw new ProposalValidationError("Pick a valid place category.");
      }
      if (typeof patch.lat !== "number" || typeof patch.lon !== "number") {
        throw new ProposalValidationError(
          "Pick a map location for the new place.",
        );
      }
      return;
    }
    case "create_room": {
      const code =
        typeof patch.roomCode === "string" ? patch.roomCode.trim() : "";
      if (!code) throw new ProposalValidationError("Room code is required.");
      const buildingId = Number(patch.buildingId);
      if (!Number.isInteger(buildingId) || buildingId < 1) {
        throw new ProposalValidationError(
          "Pick the building this room belongs to.",
        );
      }
      return;
    }
    case "create_college": {
      const name =
        typeof patch.collegeName === "string" ? patch.collegeName.trim() : "";
      if (!name) throw new ProposalValidationError("College name is required.");
      return;
    }
    case "create_division": {
      const name =
        typeof patch.divisionName === "string" ? patch.divisionName.trim() : "";
      if (!name)
        throw new ProposalValidationError("Division name is required.");
      return;
    }
    case "create_organization": {
      const name = typeof patch.name === "string" ? patch.name.trim() : "";
      if (!name)
        throw new ProposalValidationError("Organization name is required.");
      const category =
        typeof patch.category === "string" ? patch.category.trim() : "";
      if (!ORG_CATEGORIES.includes(category as OrgCategory)) {
        throw new ProposalValidationError(
          "Pick a valid organization category.",
        );
      }
      if (typeof patch.lat !== "number" || typeof patch.lon !== "number") {
        throw new ProposalValidationError(
          "Pick a map location for the new organization.",
        );
      }
      return;
    }
  }
}
