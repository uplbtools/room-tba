import type { AppActions } from "@lib/context";
import type {
  BuildingData,
  CollegeData,
  DivisionData,
  DormData,
  EventData,
} from "@lib/types";
import type { ProposalEntityType } from "@lib/services/proposal-service";
import {
  invalidateLocalSyncKeys,
  requestCampusDataRefresh,
} from "@lib/local/data/invalidate-sync-key";

const ENTITY_SYNC_TABLES: Partial<Record<ProposalEntityType, string[]>> = {
  building: ["buildings"],
  create_building: ["buildings"],
  dorm: ["dorms"],
  create_dorm: ["dorms"],
  college: ["colleges"],
  create_college: ["colleges"],
  division: ["divisions"],
  create_division: ["divisions"],
  room: ["rooms"],
  create_room: ["rooms", "buildings"],
  event: ["events"],
  create_event: ["events"],
  event_locations: ["events"],
};

export function syncTablesForEntityType(
  entityType: ProposalEntityType,
): string[] {
  return ENTITY_SYNC_TABLES[entityType] ?? [];
}

/** Apply approve/publish API payload to in-memory campus data immediately. */
export function applyPublishedEntity(
  actions: AppActions,
  entityType: ProposalEntityType,
  published: unknown,
): boolean {
  if (!published || typeof published !== "object") return false;

  switch (entityType) {
    case "building":
    case "create_building":
      actions.upsertBuilding(published as BuildingData);
      return true;
    case "dorm":
    case "create_dorm":
      actions.upsertDorm(published as DormData);
      return true;
    case "college":
    case "create_college":
      actions.upsertCollege(published as CollegeData);
      return true;
    case "division":
    case "create_division":
      actions.upsertDivision(published as DivisionData);
      return true;
    case "event":
    case "create_event":
      actions.replaceEvent(published as EventData);
      return true;
    case "room":
    case "create_room":
    case "event_locations":
      return false;
    default:
      return false;
  }
}

export function afterProposalPublished(
  actions: AppActions,
  entityType: ProposalEntityType,
  published: unknown,
): void {
  const applied = applyPublishedEntity(actions, entityType, published);
  const tables = syncTablesForEntityType(entityType);
  if (tables.length > 0) {
    invalidateLocalSyncKeys(tables);
  }
  if (applied || tables.length > 0) {
    requestCampusDataRefresh();
  }
}
