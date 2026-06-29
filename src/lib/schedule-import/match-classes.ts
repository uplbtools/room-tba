import {
  isRoomScheduledClassType,
  NON_ROOM_CLASS_TYPES,
} from "@lib/amis/room-scheduled-types";
import type { ClassMapValue } from "@lib/types";
import { matchKey } from "./parse-import";
import type { ImportedScheduleRow, ScheduleMatchResult } from "./types";

export type RoomCoordLookup = (
  roomCode: string,
) => [number, number] | null | undefined;

function buildClassIndex(classes: ClassMapValue[]): Map<string, ClassMapValue> {
  const index = new Map<string, ClassMapValue>();
  for (const row of classes) {
    if (!row.courseCode || !row.section || !row.type) continue;
    const key = matchKey(
      row.courseCode.trim().toUpperCase(),
      row.section.trim().toUpperCase(),
      row.type.trim().toUpperCase(),
    );
    if (!index.has(key)) index.set(key, row);
  }
  return index;
}

function resolveCoords(
  roomCode: string | null | undefined,
  lookup: RoomCoordLookup,
): [number, number] | null {
  if (!roomCode) return null;
  const coords = lookup(roomCode);
  if (!coords) return null;
  return coords;
}

/** Match imported rows against institutional classes for the active term. */
export function matchImportedScheduleRows(
  rows: ImportedScheduleRow[],
  classes: ClassMapValue[],
  lookupRoomCoords: RoomCoordLookup,
): ScheduleMatchResult[] {
  const index = buildClassIndex(classes);

  return rows.map((row) => {
    if (!isRoomScheduledClassType(row.type)) {
      const meta = NON_ROOM_CLASS_TYPES[row.type];
      return {
        row,
        matchedClassId: null,
        roomCode: null,
        coords: null,
        unresolvedReason:
          meta?.description ??
          `${row.type} sections usually have no fixed room in Room TBA.`,
      };
    }

    const key = matchKey(row.courseCode, row.section, row.type);
    const matched = index.get(key);
    if (!matched) {
      return {
        row,
        matchedClassId: null,
        roomCode: null,
        coords: null,
        unresolvedReason: "No matching section in Room TBA for this term.",
      };
    }

    const roomCode = matched.roomCode?.trim().toUpperCase() ?? null;
    if (!roomCode) {
      return {
        row,
        matchedClassId: matched.id,
        roomCode: null,
        coords: null,
        unresolvedReason: "Matched section has no room assigned.",
      };
    }

    const coords = resolveCoords(roomCode, lookupRoomCoords);
    if (!coords) {
      return {
        row,
        matchedClassId: matched.id,
        roomCode,
        coords: null,
        unresolvedReason: `Room ${roomCode} has no map coordinates yet.`,
      };
    }

    return {
      row,
      matchedClassId: matched.id,
      roomCode,
      coords,
      unresolvedReason: null,
    };
  });
}
