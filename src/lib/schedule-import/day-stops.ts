import { parseScheduleTime } from "@lib/schedule-renderer";
import type { ScheduleDayStop, ScheduleMatchResult, Weekday } from "./types";

const SCHEDULE_TIME_RE =
  /^([MTWThFSa]+)\s+(\d{1,2}):(\d{2})\s*(AM|PM)\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM)$/i;

function to24Hour(hour: number, period: string): number {
  const p = period.toUpperCase();
  if (p === "PM" && hour !== 12) return hour + 12;
  if (p === "AM" && hour === 12) return 0;
  return hour;
}

export function parseSlotMinutes(
  scheduleStr: string,
): { startMinutes: number; endMinutes: number } | null {
  const match = scheduleStr.match(SCHEDULE_TIME_RE);
  if (!match) return null;

  const startHour = to24Hour(parseInt(match[2], 10), match[4]);
  const startMin = parseInt(match[3], 10);
  const endHour = to24Hour(parseInt(match[5], 10), match[7]);
  const endMin = parseInt(match[6], 10);

  return {
    startMinutes: startHour * 60 + startMin,
    endMinutes: endHour * 60 + endMin,
  };
}

/** Tokenize AMIS day string (handles T vs Th). */
export function tokenizeScheduleDays(days: string): Weekday[] {
  // Case-insensitive: AMIS/DB data mixes casing — seed "Th"/"TTh" vs
  // production "TH"/"TTH". Check the 2-char Thursday token before single T.
  const upper = days.toUpperCase();
  const tokens: Weekday[] = [];
  let i = 0;
  while (i < upper.length) {
    if (upper.startsWith("TH", i)) {
      tokens.push("Th");
      i += 2;
    } else if (upper[i] === "T") {
      tokens.push("T");
      i += 1;
    } else if (upper[i] === "M") {
      tokens.push("M");
      i += 1;
    } else if (upper[i] === "W") {
      tokens.push("W");
      i += 1;
    } else if (upper[i] === "F") {
      tokens.push("F");
      i += 1;
    } else if (upper[i] === "S") {
      tokens.push("S");
      i += 1;
    } else {
      i += 1;
    }
  }
  return tokens;
}

export function scheduleSlotOnWeekday(
  scheduleStr: string,
  weekday: Weekday,
): boolean {
  const parsed = parseScheduleTime(scheduleStr);
  if (!parsed) return false;
  return tokenizeScheduleDays(parsed.days).includes(weekday);
}

/** Build time-ordered routable stops for a weekday. Skips unresolved rows. */
export function orderDayStops(
  matches: ScheduleMatchResult[],
  weekday: Weekday,
): ScheduleDayStop[] {
  const stops: ScheduleDayStop[] = [];

  for (const match of matches) {
    if (match.unresolvedReason || !match.coords) continue;

    for (const slot of match.row.schedule) {
      if (!scheduleSlotOnWeekday(slot, weekday)) continue;
      const minutes = parseSlotMinutes(slot);
      if (!minutes) continue;

      stops.push({
        courseCode: match.row.courseCode,
        section: match.row.section,
        type: match.row.type,
        scheduleSlot: slot,
        roomCode: match.roomCode,
        coords: match.coords,
        startMinutes: minutes.startMinutes,
        endMinutes: minutes.endMinutes,
        gapMinutesAfter: null,
      });
    }
  }

  stops.sort((a, b) => {
    if (a.startMinutes !== b.startMinutes) {
      return a.startMinutes - b.startMinutes;
    }
    return a.endMinutes - b.endMinutes;
  });

  for (let i = 0; i < stops.length - 1; i += 1) {
    const gap = stops[i + 1].startMinutes - stops[i].endMinutes;
    stops[i].gapMinutesAfter = gap >= 0 ? gap : null;
  }

  return stops;
}

export function formatMinutes(minutes: number): string {
  const hour24 = Math.floor(minutes / 60);
  const min = minutes % 60;
  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return min > 0
    ? `${hour12}:${String(min).padStart(2, "0")} ${period}`
    : `${hour12} ${period}`;
}
