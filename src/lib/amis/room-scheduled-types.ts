/** AMIS class types that normally meet in a campus room (import + room schedules). */
export const ROOM_SCHEDULED_CLASS_TYPES = new Set(["LEC", "LAB", "RCT"]);

/** AMIS types imported without a required room (thesis, SP, etc.). */
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

/** Short copy for room schedule panels (per-room class lists). */
export const ROOM_SCHEDULE_SCOPE_NOTE =
  "Schedules list lecture, lab, and recitation sections with assigned rooms. Thesis, special problem, dissertation, and similar sections usually are not tied to a room in AMIS, so they do not appear here.";

/** Short copy for class browse / course-prefix search. */
export const CLASS_BROWSE_SCOPE_NOTE =
  "Class search lists lecture, lab, recitation, thesis, special problem, dissertation, and similar sections. Sections without a room in AMIS show as unassigned; open a room only when a room code is listed.";

export const NO_ASSIGNED_ROOM_LABEL = "No assigned room";

/**
 * Disclaimer for course/section data during enrollment. Offerings are not final
 * until the last day of change of matriculation. Kept date-free on purpose so it
 * stays correct across terms.
 */
export const COURSE_CHANGE_DISCLAIMER =
  "Course offerings may still change up to the last day of change of matriculation.";

export function isRoomScheduledClassType(type: string | null | undefined) {
  if (!type) return false;
  return ROOM_SCHEDULED_CLASS_TYPES.has(type.trim().toUpperCase());
}

export function isNonRoomClassType(type: string | null | undefined) {
  if (!type) return false;
  return type.trim().toUpperCase() in NON_ROOM_CLASS_TYPES;
}

export function classTypeDisplayLabel(type: string | null | undefined) {
  if (!type) return "Class";
  const key = type.trim().toUpperCase();
  return NON_ROOM_CLASS_TYPES[key]?.label ?? key;
}
