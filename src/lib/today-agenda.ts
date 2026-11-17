// Today screen (#774): a read-only agenda over the planner's saved sections.
// Day boundaries are Asia/Manila — the same notion of "today" the term
// selector uses (term-calendar.ts).

import { sectionBlocks } from "./planner/conflicts.js";
import type { PlannedSection } from "./planner/types.js";
import { toManilaDateKey } from "./term-calendar.js";

export type AgendaEntry = {
  courseCode: string;
  section: string;
  type: string;
  roomCode: string | null;
  courseTitle: string | null;
  /** Minutes since midnight. */
  startMin: number;
  endMin: number;
  /** "7:00 AM – 8:00 AM" */
  timeLabel: string;
};

export type AgendaDay = {
  /** YYYY-MM-DD, Asia/Manila. */
  dateKey: string;
  /** 0-5 = Mon-Sat (matches parseDays); null on Sunday, which AMIS never schedules. */
  dayIndex: number | null;
  /** "Today" | "Tomorrow" | "Wednesday" */
  title: string;
  /** "Jul 29" */
  dateLabel: string;
  isToday: boolean;
  isWeekend: boolean;
  /** Copy to show when `entries` is empty. */
  emptyLabel: string;
  entries: AgendaEntry[];
};

const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/** Parse a YYYY-MM-DD key as a UTC instant so day math never crosses a zone. */
function keyToUtc(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function addDays(dateKey: string, days: number): string {
  const date = keyToUtc(dateKey);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** "7:00 AM" from minutes since midnight. */
function formatClock(minutes: number): string {
  const hour24 = Math.floor(minutes / 60) % 24;
  const minute = minutes % 60;
  const period = hour24 >= 12 ? "PM" : "AM";
  const hour = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour}:${String(minute).padStart(2, "0")} ${period}`;
}

export function formatTimeRange(startMin: number, endMin: number): string {
  return `${formatClock(startMin)} – ${formatClock(endMin)}`;
}

/** When to leave for a class that starts `startMin`, after one ending `prevEndMin`. */
export function leaveByNote(
  prevEndMin: number,
  startMin: number,
  walkSeconds: number,
  fromRoom: string,
): string {
  const walk = Math.ceil(walkSeconds / 60);
  const late = prevEndMin + walk - startMin;
  return late > 0
    ? `${walk} min walk from ${fromRoom}, so you'll be about ${late} min late`
    : `Leave by ${formatClock(startMin - walk)}, ${walk} min walk from ${fromRoom}`;
}

/**
 * Agenda for `days` consecutive Manila days starting with today.
 *
 * Stale sections (natural key gone after a term reimport) are left out — they
 * are not classes anyone can attend; the planner lists them separately. TBA
 * and unparseable schedule strings produce no blocks, so they drop out too.
 */
export function buildAgenda(
  sections: PlannedSection[],
  options: { now?: Date; days?: number } = {},
): AgendaDay[] {
  const todayKey = toManilaDateKey(options.now ?? new Date());
  const dayCount = options.days ?? 7;

  const byDayIndex = new Map<number, AgendaEntry[]>();
  for (const section of sections) {
    if (section.stale) continue;
    for (const block of sectionBlocks(section)) {
      const entries = byDayIndex.get(block.dayIndex) ?? [];
      entries.push({
        courseCode: section.courseCode,
        section: section.section,
        type: section.type,
        roomCode: section.roomCode,
        courseTitle: section.courseTitle ?? null,
        startMin: block.startMin,
        endMin: block.endMin,
        timeLabel: formatTimeRange(block.startMin, block.endMin),
      });
      byDayIndex.set(block.dayIndex, entries);
    }
  }
  for (const entries of byDayIndex.values()) {
    entries.sort(
      (a, b) =>
        a.startMin - b.startMin || a.courseCode.localeCompare(b.courseCode),
    );
  }

  return Array.from({ length: dayCount }, (_, offset) => {
    const dateKey = addDays(todayKey, offset);
    const weekday = keyToUtc(dateKey).getUTCDay(); // 0 = Sunday
    const dayIndex = weekday === 0 ? null : weekday - 1;
    const isToday = offset === 0;
    return {
      dateKey,
      dayIndex,
      title:
        offset === 0
          ? "Today"
          : offset === 1
            ? "Tomorrow"
            : WEEKDAY_NAMES[weekday],
      dateLabel: keyToUtc(dateKey).toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }),
      isToday,
      // Saturday still carries classes at UPLB (midyear TTHS blocks); it is
      // styled as a weekend but only Sunday gets the "never any classes" copy.
      isWeekend: weekday === 0 || weekday === 6,
      emptyLabel:
        weekday === 0
          ? "No classes on Sundays."
          : isToday
            ? "No classes today."
            : "No classes.",
      entries: dayIndex === null ? [] : (byDayIndex.get(dayIndex) ?? []),
    };
  });
}
