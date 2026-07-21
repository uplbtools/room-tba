import {
  isLandmarkPlaceCategory,
  type PlaceCategory,
} from "@constants/place-categories";
import {
  isStudentOrganization,
  type OrgCategory,
} from "@constants/org-categories";
import { formatCampusDateShort } from "@lib/event-time";
import type { ProposalCreateType } from "@lib/proposals/client";

export type DraftPinEntityKind =
  | "building"
  | "dorm"
  | "place"
  | "organization"
  | "event";

export type DraftPinPreview = {
  kind: DraftPinEntityKind;
  label: string;
  placeCategory?: PlaceCategory;
  orgCategory?: OrgCategory;
  eventStartsAt?: string;
  eventImageUrl?: string | null;
};

export type EntityPinTone =
  | "building"
  | "dorm"
  | "organization"
  | "office"
  | "landmark"
  | "establishment";

export type DraftPinIconKind =
  | "university"
  | "house"
  | "landmark"
  | "store"
  | "users"
  | "briefcase"
  | "event";

export type DraftPinMapProps = {
  component: "entity" | "event";
  tone?: EntityPinTone;
  icon: DraftPinIconKind;
  label: string;
  dateLabel?: string;
  imageSrc?: string | null;
};

export type SuggestAdditionPreviewInput = {
  kind: ProposalCreateType;
  buildingName: string;
  dormName: string;
  placeName: string;
  placeCategory: PlaceCategory;
  organizationName: string;
  organizationCategory: OrgCategory;
  eventTitle: string;
  eventStartsAt: string;
  eventImageUrl: string | null;
};

export function buildDraftPinPreview(
  input: SuggestAdditionPreviewInput,
): DraftPinPreview | null {
  switch (input.kind) {
    case "create_building": {
      const label = input.buildingName.trim();
      return label ? { kind: "building", label } : null;
    }
    case "create_dorm": {
      const label = input.dormName.trim();
      return label ? { kind: "dorm", label } : null;
    }
    case "create_place": {
      const label = input.placeName.trim();
      return label
        ? { kind: "place", label, placeCategory: input.placeCategory }
        : null;
    }
    case "create_organization": {
      const label = input.organizationName.trim();
      return label
        ? {
            kind: "organization",
            label,
            orgCategory: input.organizationCategory,
          }
        : null;
    }
    case "create_event": {
      const label = input.eventTitle.trim();
      return label
        ? {
            kind: "event",
            label,
            eventStartsAt: input.eventStartsAt,
            eventImageUrl: input.eventImageUrl,
          }
        : null;
    }
    default:
      return null;
  }
}

export function draftPinMapProps(preview: DraftPinPreview): DraftPinMapProps {
  switch (preview.kind) {
    case "building":
      return {
        component: "entity",
        tone: "building",
        icon: "university",
        label: preview.label,
      };
    case "dorm":
      return {
        component: "entity",
        tone: "dorm",
        icon: "house",
        label: preview.label,
      };
    case "place": {
      const landmark = isLandmarkPlaceCategory(preview.placeCategory);
      return {
        component: "entity",
        tone: landmark ? "landmark" : "establishment",
        icon: landmark ? "landmark" : "store",
        label: preview.label,
      };
    }
    case "organization": {
      const student = isStudentOrganization(preview.orgCategory);
      return {
        component: "entity",
        tone: student ? "organization" : "office",
        icon: student ? "users" : "briefcase",
        label: preview.label,
      };
    }
    case "event":
      return {
        component: "event",
        icon: "event",
        label: preview.label,
        dateLabel: formatDraftEventDateLabel(preview.eventStartsAt),
        imageSrc: preview.eventImageUrl,
      };
  }
}

function formatDraftEventDateLabel(startsAt: string | undefined): string {
  if (!startsAt?.trim()) return "TBD";
  const formatted = formatCampusDateShort(startsAt);
  return formatted || "TBD";
}

export function draftPinRowLabel(
  preview: DraftPinPreview | null,
  hasCoords: boolean,
): string {
  if (!hasCoords) return "Drop a pin on the map";
  if (!preview?.label) return "Pin set on map";
  return `Pin set · ${preview.label}`;
}
