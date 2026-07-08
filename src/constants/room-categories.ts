/**
 * Room purpose categories (#537). Independent of the LEC/LAB *class* type — a
 * room is a physical space that may be a classroom, an office, an org tambayan,
 * an event venue, etc. `null`/absent means untagged (treated as a classroom).
 */
export const ROOM_CATEGORIES = [
  "classroom",
  "laboratory",
  "office",
  "org-tambayan",
  "event-venue",
  "facility",
] as const;

export type RoomCategory = (typeof ROOM_CATEGORIES)[number];

const ROOM_CATEGORY_SET = new Set<string>(ROOM_CATEGORIES);

export const ROOM_CATEGORY_LABELS: Record<RoomCategory, string> = {
  classroom: "Classroom",
  laboratory: "Laboratory",
  office: "Office",
  "org-tambayan": "Org Tambayan",
  "event-venue": "Event Venue",
  facility: "Facility",
};

/** Normalize an arbitrary stored value to a known category, else null. */
export function normalizeRoomCategory(value: unknown): RoomCategory | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  return ROOM_CATEGORY_SET.has(v) ? (v as RoomCategory) : null;
}

export function roomCategoryLabel(value: unknown): string | null {
  const c = normalizeRoomCategory(value);
  return c ? ROOM_CATEGORY_LABELS[c] : null;
}
