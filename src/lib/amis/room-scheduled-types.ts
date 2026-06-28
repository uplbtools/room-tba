/** AMIS class types that normally meet in a campus room (import + room schedules). */
export const ROOM_SCHEDULED_CLASS_TYPES = new Set(["LEC", "LAB"]);

/** AMIS types we skip on import — usually no room assignment in AMIS. */
export const NON_ROOM_CLASS_TYPES: Readonly<
  Record<string, { label: string; description: string }>
> = {
  THE: {
    label: "Thesis",
    description: "Thesis sections usually have no fixed room in AMIS.",
  },
  SPR: {
    label: "Special problem",
    description: "Special-problem sections usually have no fixed room in AMIS.",
  },
  PRA: {
    label: "Practicum",
    description:
      "Practicum sections may meet off-campus or without a room code.",
  },
  DSR: {
    label: "Dissertation",
    description: "Dissertation sections usually have no fixed room in AMIS.",
  },
  IND: {
    label: "Independent study",
    description: "Independent study usually has no fixed room in AMIS.",
  },
};

/** Short copy for the room schedule panel in the app. */
export const ROOM_SCHEDULE_SCOPE_NOTE =
  "Schedules list lecture and lab sections with assigned rooms. Thesis, special problem, dissertation, and similar sections usually are not tied to a room in AMIS, so they do not appear here.";

export function isRoomScheduledClassType(type: string | null | undefined) {
  if (!type) return false;
  return ROOM_SCHEDULED_CLASS_TYPES.has(type.trim().toUpperCase());
}
