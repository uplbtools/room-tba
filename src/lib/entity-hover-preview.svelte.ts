import { orgCategoryLabel } from "@constants/org-categories";
import { placeDirectoryLabel } from "@constants/place-categories";
import type {
  BuildingData,
  DormData,
  EventData,
  OrgData,
  PlaceData,
} from "@lib/types";

export type EntityHoverPreview =
  | {
      kind: "building";
      id: number;
      name: string;
      buildingType: string | null;
      directions: string | null;
    }
  | {
      kind: "dorm";
      id: number;
      name: string;
      isUpManaged: boolean;
      directions: string | null;
    }
  | {
      kind: "event";
      slug: string;
      title: string;
      category: string | null;
      imageUrl: string | null;
    }
  | {
      kind: "organization";
      id: number;
      name: string;
      category: string | null;
      description: string | null;
    }
  | {
      kind: "place";
      id: number;
      name: string;
      category: string | null;
      description: string | null;
    };

export type HoverAnchor = {
  x: number;
  y: number;
};

class EntityHoverPreviewStore {
  entity = $state<EntityHoverPreview | null>(null);
  anchor = $state<HoverAnchor | null>(null);
  private hideTimer: ReturnType<typeof setTimeout> | null = null;

  show(entity: EntityHoverPreview, anchor: HoverAnchor) {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
    this.entity = entity;
    this.anchor = anchor;
  }

  scheduleHide(delayMs = 120) {
    if (this.hideTimer) clearTimeout(this.hideTimer);
    this.hideTimer = setTimeout(() => {
      this.entity = null;
      this.anchor = null;
      this.hideTimer = null;
    }, delayMs);
  }

  hideNow() {
    if (this.hideTimer) clearTimeout(this.hideTimer);
    this.hideTimer = null;
    this.entity = null;
    this.anchor = null;
  }
}

export const entityHoverPreviewStore = new EntityHoverPreviewStore();

export function buildingPreviewFromRow(
  building: BuildingData,
): EntityHoverPreview {
  return {
    kind: "building",
    id: building.id,
    name: building.buildingName,
    buildingType: building.buildingType ?? null,
    directions: building.directions ?? null,
  };
}

export function dormPreviewFromRow(dorm: DormData): EntityHoverPreview {
  return {
    kind: "dorm",
    id: dorm.id,
    name: dorm.dormName,
    isUpManaged: dorm.isUpManaged,
    directions: dorm.directions ?? null,
  };
}

export function eventPreviewFromRow(event: EventData): EntityHoverPreview {
  return {
    kind: "event",
    slug: event.slug,
    title: event.title,
    category: event.category ?? null,
    imageUrl: event.imageUrl ?? null,
  };
}

export function organizationPreviewFromRow(
  organization: OrgData,
): EntityHoverPreview {
  return {
    kind: "organization",
    id: organization.id,
    name: organization.name,
    category: orgCategoryLabel(organization.category),
    description: organization.description ?? null,
  };
}

export function placePreviewFromRow(place: PlaceData): EntityHoverPreview {
  return {
    kind: "place",
    id: place.id,
    name: place.name,
    category: placeDirectoryLabel(place.category),
    description: place.description ?? null,
  };
}

export function isBuildingHoverPreview(
  entity: EntityHoverPreview | null,
  buildingId: number,
): boolean {
  return entity?.kind === "building" && entity.id === buildingId;
}

export function isDormHoverPreview(
  entity: EntityHoverPreview | null,
  dormId: number,
): boolean {
  return entity?.kind === "dorm" && entity.id === dormId;
}

export function isEventHoverPreview(
  entity: EntityHoverPreview | null,
  eventSlug: string,
): boolean {
  return entity?.kind === "event" && entity.slug === eventSlug;
}

export function isOrganizationHoverPreview(
  entity: EntityHoverPreview | null,
  organizationId: number,
): boolean {
  return entity?.kind === "organization" && entity.id === organizationId;
}

export function isPlaceHoverPreview(
  entity: EntityHoverPreview | null,
  placeId: number,
): boolean {
  return entity?.kind === "place" && entity.id === placeId;
}
