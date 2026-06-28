/**
 * Campus event time helpers.
 *
 * Event timestamps are stored in `timestamp without time zone` columns and
 * represent the local campus wall-clock time in Asia/Manila. The Philippines
 * has observed a fixed UTC+8 offset with no daylight saving for decades, so we
 * can treat the campus offset as constant.
 *
 * To avoid the timezone bugs that come from `new Date("YYYY-MM-DD HH:mm:ss")`
 * being interpreted in the *server's* local zone (UTC on Vercel) or the
 * *browser's* zone, every conversion here is explicit:
 *  - Stored wall-clock strings are interpreted as Asia/Manila.
 *  - Displayed times are always formatted in Asia/Manila.
 *  - `datetime-local` inputs are treated as Asia/Manila wall-clock time.
 */

import {
  CAMPUS_SEMESTER_MONTHS,
  type SemesterRecurrence,
} from "./campus-calendar";

export type { SemesterRecurrence } from "./campus-calendar";

export const CAMPUS_TIME_ZONE = "Asia/Manila";
const CAMPUS_UTC_OFFSET = "+08:00";

export const UPCOMING_WINDOW_MS = 90 * 24 * 60 * 60 * 1000;

export type EventRecurrence =
  "none" | "annual" | "every_1st_sem" | "every_2nd_sem";

export type StoredEventTiming = {
  startsAt: string;
  endsAt: string;
  recurrence: EventRecurrence;
};

type WallParts = {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
  second: string;
};

/** Pull Y/M/D h:m:s out of a wall-clock string, ignoring any trailing zone. */
function parseWallParts(value: string): WallParts | null {
  const match = value
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return null;
  return {
    year: match[1]!,
    month: match[2]!,
    day: match[3]!,
    hour: match[4]!,
    minute: match[5]!,
    second: match[6] ?? "00",
  };
}

/** Extract Asia/Manila wall-clock parts from a real instant. */
function getCampusParts(instant: Date): WallParts | null {
  if (Number.isNaN(instant.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CAMPUS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(instant);

  const lookup = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  let hour = lookup("hour");
  if (hour === "24") hour = "00";

  return {
    year: lookup("year"),
    month: lookup("month"),
    day: lookup("day"),
    hour,
    minute: lookup("minute"),
    second: lookup("second"),
  };
}

/**
 * Interpret a stored campus wall-clock string as a real instant.
 * Returns an `Invalid Date` only when the input is unparseable.
 */
export function campusWallTimeToInstant(value: string): Date {
  const parts = parseWallParts(value);
  if (!parts) return new Date(value);
  const { year, month, day, hour, minute, second } = parts;
  return new Date(
    `${year}-${month}-${day}T${hour}:${minute}:${second}${CAMPUS_UTC_OFFSET}`,
  );
}

/**
 * Project a stored campus wall-clock occurrence into the current campus year.
 */
export function projectCampusOccurrence(
  startWall: string,
  endWall: string,
  now: Date,
): { startsAt: Date; endsAt: Date } {
  const start = campusWallTimeToInstant(startWall);
  const end = campusWallTimeToInstant(endWall);
  const duration = Math.max(end.getTime() - start.getTime(), 0);

  const startParts = parseWallParts(startWall);
  const nowParts = getCampusParts(now);
  if (!startParts || !nowParts) return { startsAt: start, endsAt: end };

  const buildStart = (year: number) =>
    campusWallTimeToInstant(
      `${String(year).padStart(4, "0")}-${startParts.month}-${startParts.day}T${startParts.hour}:${startParts.minute}:${startParts.second}`,
    );

  let projectedStart = buildStart(Number(nowParts.year));
  let projectedEnd = new Date(projectedStart.getTime() + duration);
  if (projectedEnd.getTime() < now.getTime()) {
    projectedStart = buildStart(Number(nowParts.year) + 1);
    projectedEnd = new Date(projectedStart.getTime() + duration);
  }

  return { startsAt: projectedStart, endsAt: projectedEnd };
}

/** Project a semester-recurring event into the current-or-next semester window. */
export function projectCampusSemesterOccurrence(
  startWall: string,
  endWall: string,
  now: Date,
  semester: SemesterRecurrence,
): { startsAt: Date; endsAt: Date } {
  const start = campusWallTimeToInstant(startWall);
  const end = campusWallTimeToInstant(endWall);
  const duration = Math.max(end.getTime() - start.getTime(), 0);

  const startParts = parseWallParts(startWall);
  const nowParts = getCampusParts(now);
  if (!startParts || !nowParts) return { startsAt: start, endsAt: end };

  const months = CAMPUS_SEMESTER_MONTHS[semester];
  const inWindow = months.includes(Number(startParts.month));
  const month = inWindow
    ? startParts.month
    : String(months[0]).padStart(2, "0");
  const day = inWindow ? startParts.day : "01";

  const buildStart = (year: number) =>
    campusWallTimeToInstant(
      `${String(year).padStart(4, "0")}-${month}-${day}T${startParts.hour}:${startParts.minute}:${startParts.second}`,
    );

  const nowYear = Number(nowParts.year);
  for (const year of [nowYear - 1, nowYear, nowYear + 1]) {
    const candidateStart = buildStart(year);
    const candidateEnd = new Date(candidateStart.getTime() + duration);
    if (candidateEnd.getTime() >= now.getTime()) {
      return { startsAt: candidateStart, endsAt: candidateEnd };
    }
  }

  const fallbackStart = buildStart(nowYear + 1);
  return {
    startsAt: fallbackStart,
    endsAt: new Date(fallbackStart.getTime() + duration),
  };
}

export function getStoredEventOccurrence(
  event: StoredEventTiming,
  now = new Date(),
): { startsAt: Date; endsAt: Date } {
  switch (event.recurrence) {
    case "none":
      return {
        startsAt: campusWallTimeToInstant(event.startsAt),
        endsAt: campusWallTimeToInstant(event.endsAt),
      };
    case "every_1st_sem":
    case "every_2nd_sem":
      return projectCampusSemesterOccurrence(
        event.startsAt,
        event.endsAt,
        now,
        event.recurrence,
      );
    case "annual":
    default:
      return projectCampusOccurrence(event.startsAt, event.endsAt, now);
  }
}

export function getStoredEventStatus(
  occurrence: { startsAt: Date; endsAt: Date },
  now = new Date(),
): "active" | "upcoming" | "past" {
  const nowTime = now.getTime();
  if (
    occurrence.startsAt.getTime() <= nowTime &&
    occurrence.endsAt.getTime() >= nowTime
  ) {
    return "active";
  }
  if (
    occurrence.startsAt.getTime() > nowTime &&
    occurrence.startsAt.getTime() - nowTime <= UPCOMING_WINDOW_MS
  ) {
    return "upcoming";
  }
  return "past";
}

export function refreshStoredEventTiming<
  T extends StoredEventTiming & {
    status: "active" | "upcoming" | "past";
    occurrenceStartsAt: string;
    occurrenceEndsAt: string;
  },
>(event: T, now = new Date()): T {
  const occurrence = getStoredEventOccurrence(event, now);
  return {
    ...event,
    status: getStoredEventStatus(occurrence, now),
    occurrenceStartsAt: occurrence.startsAt.toISOString(),
    occurrenceEndsAt: occurrence.endsAt.toISOString(),
  };
}

export function sortStoredEvents<
  T extends { priority: number; occurrenceStartsAt: string },
>(events: T[]): T[] {
  return [...events].sort((a, b) => {
    const priorityDelta = b.priority - a.priority;
    if (priorityDelta !== 0) return priorityDelta;
    return a.occurrenceStartsAt.localeCompare(b.occurrenceStartsAt);
  });
}

export function instantToCampusInput(value: string | Date): string {
  const parts = getCampusParts(new Date(value));
  if (!parts) return "";
  const { year, month, day, hour, minute } = parts;
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

export function campusInputToWallString(input: string): string {
  const parts = parseWallParts(input);
  if (!parts) return input;
  const { year, month, day, hour, minute, second } = parts;
  return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
}

export function instantToCampusWallString(value: string | Date): string {
  const parts = getCampusParts(new Date(value));
  if (!parts) return "";
  const { year, month, day, hour, minute, second } = parts;
  return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
}

function campusFormat(
  value: string | Date,
  options: Intl.DateTimeFormatOptions,
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, {
    ...options,
    timeZone: CAMPUS_TIME_ZONE,
  }).format(date);
}

export function formatCampusDateTime(value: string | Date): string {
  return campusFormat(value, { dateStyle: "medium", timeStyle: "short" });
}

export function formatCampusDateShort(value: string | Date): string {
  return campusFormat(value, { month: "short", day: "numeric" });
}

export function formatCampusTime(value: string | Date): string {
  return campusFormat(value, { hour: "numeric", minute: "2-digit" });
}

export function formatCampusDateLong(value: string | Date): string {
  return campusFormat(value, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isSameCampusDay(a: string | Date, b: string | Date): boolean {
  return formatCampusDateLong(a) === formatCampusDateLong(b);
}

export function formatCampusRange(
  startsAt: string | Date,
  endsAt: string | Date,
): string {
  const start = formatCampusDateTime(startsAt);
  if (!start) return "";
  const end = isSameCampusDay(startsAt, endsAt)
    ? formatCampusTime(endsAt)
    : formatCampusDateTime(endsAt);
  if (!end) return start;
  return `${start} \u2013 ${end}`;
}
