import type { MapMoveCoordinates } from "../map-move-history";
import type { EventData } from "../types";

export type EditableEntityType = "building" | "dorm";
export type EditableCoords = MapMoveCoordinates;
export type EditableVersionedPosition = EditableCoords & { version: number };

export type EditableUpdateResponse = {
  building?: EditableVersionedPosition;
  dorm?: EditableVersionedPosition;
};

export type EventLocationWriteValue = Partial<{
  id: number;
  anchorType: EventData["locations"][number]["anchorType"];
  buildingId: number | null;
  dormId: number | null;
  label: string;
  lat: number | null;
  lon: number | null;
  highlightPriority: number;
  sortOrder: number;
  isPrimary: boolean;
}>;

export type EventLocationsPatchResponse = {
  event?: EventData;
  latest?: EventData | null;
  error?: string;
};

export type EditableConflictResponse = {
  error?: string;
  latest?: EditableVersionedPosition | null;
};
