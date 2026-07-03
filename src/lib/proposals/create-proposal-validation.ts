import type { ProposalCreateType } from "@lib/services/proposal-service";

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
  }
}
