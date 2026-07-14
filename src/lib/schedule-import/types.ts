export type Weekday = "M" | "T" | "W" | "Th" | "F" | "S";

export const WEEKDAYS: Weekday[] = ["M", "T", "W", "Th", "F", "S"];

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  M: "Mon",
  T: "Tue",
  W: "Wed",
  Th: "Thu",
  F: "Fri",
  S: "Sat",
};

/** Normalized personal schedule row (no instructor PII). */
export type ImportedScheduleRow = {
  courseCode: string;
  section: string;
  type: string;
  schedule: string[];
};

export type ScheduleMatchResult = {
  row: ImportedScheduleRow;
  matchedClassId: number | null;
  roomCode: string | null;
  coords: [number, number] | null;
  unresolvedReason: string | null;
};

export type ScheduleDayStop = {
  courseCode: string;
  section: string;
  type: string;
  scheduleSlot: string;
  roomCode: string | null;
  coords: [number, number] | null;
  startMinutes: number;
  endMinutes: number;
  gapMinutesAfter: number | null;
};
