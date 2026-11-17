import { holidaysWithin, milestonesForTerms } from "@lib/academic-milestones";
import { getRoomCanonicalPath } from "@lib/entity-urls";
import { parseDays, parseScheduleTime } from "@lib/schedule-renderer";
import { absoluteUrl } from "@lib/site";
import type { FinalExamRow } from "@lib/types";
import { sectionNaturalKey, type PlannerPlan } from "./types.js";

const TZID = "Asia/Manila";
const MANILA_OFFSET_MINUTES = 8 * 60;

// dayIndex 0-5 (M-S) -> RFC 5545 BYDAY / JS getUTCDay (Mon=1 … Sat=6).
const BYDAY = ["MO", "TU", "WE", "TH", "FR", "SA"] as const;

const pad = (n: number) => String(n).padStart(2, "0");

function toIcsUtc(dateUtc: Date): string {
  return (
    `${dateUtc.getUTCFullYear()}${pad(dateUtc.getUTCMonth() + 1)}${pad(dateUtc.getUTCDate())}` +
    `T${pad(dateUtc.getUTCHours())}${pad(dateUtc.getUTCMinutes())}${pad(dateUtc.getUTCSeconds())}Z`
  );
}

const toIcsLocal = (dateOnly: Date, minutesOfDay: number): string =>
  `${dateOnly.getUTCFullYear()}${pad(dateOnly.getUTCMonth() + 1)}${pad(dateOnly.getUTCDate())}` +
  `T${pad(Math.floor(minutesOfDay / 60))}${pad(minutesOfDay % 60)}00`;

const dayKey = (date: Date): string => date.toISOString().slice(0, 10);

const encoder = new TextEncoder();

/** RFC 5545 line folding at 75 octets, never inside a multibyte character. */
function fold(line: string): string {
  const parts: string[] = [];
  let current = "";
  let bytes = 0;
  let limit = 75;
  for (const char of line) {
    const size = encoder.encode(char).length;
    if (bytes + size > limit) {
      parts.push(current);
      current = "";
      bytes = 0;
      limit = 74;
    }
    current += char;
    bytes += size;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

/** Manila wall-clock on a given date -> UTC Date. */
function manilaToUtc(dateOnly: Date, minutesOfDay: number): Date {
  return new Date(
    Date.UTC(
      dateOnly.getUTCFullYear(),
      dateOnly.getUTCMonth(),
      dateOnly.getUTCDate(),
      0,
      minutesOfDay - MANILA_OFFSET_MINUTES,
      0,
    ),
  );
}

function parseDateOnly(value: string | null | undefined): Date | null {
  if (!value) return null;
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  );
}

/** First date >= from whose weekday (Mon=1…) is in dayIndices (0-5 = M-S). */
function firstMatchingDate(from: Date, dayIndices: number[]): Date {
  const wanted = new Set(dayIndices.map((d) => d + 1));
  const date = new Date(from.getTime());
  for (let i = 0; i < 7; i++) {
    if (wanted.has(date.getUTCDay())) return date;
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return from;
}

const escapeIcsText = (text: string): string =>
  text
    .replaceAll("\\", "\\\\")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,")
    .replaceAll("\n", "\\n");

export type IcsTermWindow = {
  startsOn: string | null;
  endsOn: string | null;
};

type IcsOptions = {
  now?: Date;
  finals?: FinalExamRow[];
  roomIds?: Record<string, number>;
};

/** First and last class day from the registrar calendar, or null when the term has none. */
function classWindow(termId: number): IcsTermWindow | null {
  const rows = milestonesForTerms([termId]);
  const start = rows.find((m) => m.label === "Start of classes");
  const end = rows.find((m) => m.label === "End of classes");
  return start && end ? { startsOn: start.startsOn, endsOn: end.endsOn } : null;
}

/** Holidays and breaks (YYYY-MM-DD) inside the class window, sorted. */
function offDays(termId: number, startKey: string, endKey: string): string[] {
  const days = new Set(
    holidaysWithin(startKey, endKey).map((holiday) => holiday.startsOn),
  );
  for (const row of milestonesForTerms([termId])) {
    if (!/break$/i.test(row.label)) continue;
    const day = new Date(row.startsOn);
    for (; dayKey(day) <= row.endsOn; day.setUTCDate(day.getUTCDate() + 1)) {
      days.add(dayKey(day));
    }
  }
  return [...days].sort();
}

function minutesOf(time: string): number | null {
  const match = time.match(/^(\d{1,2}):(\d{2})/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

/**
 * Build an iCalendar string for a plan: one weekly-recurring VEVENT per
 * parsed schedule string, bounded by the registrar's first and last class
 * day (falling back to `term`), with holidays and breaks as EXDATEs, plus
 * one event per final exam. TBA/unparseable schedules are skipped.
 */
export function buildPlanIcs(
  plan: PlannerPlan,
  term: IcsTermWindow | null,
  { now = new Date(), finals = [], roomIds = {} }: IcsOptions = {},
): string {
  const window = classWindow(plan.termId) ?? term;
  const termStart = parseDateOnly(window?.startsOn);
  const termEnd = parseDateOnly(window?.endsOn);
  // ponytail: without term dates, emit one non-recurring week from `now` —
  // upgrade path is filling starts_on/ends_on on the terms table.
  const rangeStart =
    termStart ??
    new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
  const off =
    termStart && termEnd
      ? offDays(plan.termId, dayKey(termStart), dayKey(termEnd))
      : [];
  const dtStamp = toIcsUtc(now);

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Room TBA//Course Planner//EN",
    "BEGIN:VTIMEZONE",
    `TZID:${TZID}`,
    "BEGIN:STANDARD",
    "DTSTART:19700101T000000",
    "TZOFFSETFROM:+0800",
    "TZOFFSETTO:+0800",
    "TZNAME:PST",
    "END:STANDARD",
    "END:VTIMEZONE",
  ];

  const pushPlace = (
    roomCode: string | null,
    roomId: number | null | undefined,
  ) => {
    if (!roomCode) return;
    lines.push(`LOCATION:${escapeIcsText(roomCode)}`);
    if (!roomId) return;
    const url = absoluteUrl(
      getRoomCanonicalPath({ id: roomId, code: roomCode }),
    );
    lines.push(
      `URL:${url}`,
      `DESCRIPTION:${escapeIcsText(`Open in Room TBA: ${url}`)}`,
    );
  };

  for (const section of plan.sections) {
    (section.schedule ?? []).forEach((scheduleStr, scheduleIndex) => {
      const parsed = parseScheduleTime(scheduleStr);
      if (!parsed) return;
      const dayIndices = parseDays(parsed.days).filter(
        (d) => d >= 0 && d < BYDAY.length,
      );
      if (dayIndices.length === 0) return;

      const summary = escapeIcsText(
        `${section.courseCode} ${section.type} (${section.section})`,
      );
      // With a term end, one recurring VEVENT covers every day via BYDAY;
      // without it, emit one plain event per day so no day is lost.
      const eventDayGroups = termEnd
        ? [dayIndices]
        : dayIndices.map((d) => [d]);

      for (const days of eventDayGroups) {
        const firstDay = firstMatchingDate(rangeStart, days);
        lines.push(
          "BEGIN:VEVENT",
          `UID:${encodeURIComponent(sectionNaturalKey(section))}-${plan.termId}-${scheduleIndex}-${days.join("")}@room-tba`,
          `DTSTAMP:${dtStamp}`,
          `DTSTART;TZID=${TZID}:${toIcsLocal(firstDay, parsed.startMinutes)}`,
          `DTEND;TZID=${TZID}:${toIcsLocal(firstDay, parsed.endMinutes)}`,
          `SUMMARY:${summary}`,
        );
        pushPlace(section.roomCode, roomIds[section.roomCode ?? ""]);
        if (termEnd) {
          const until = toIcsUtc(manilaToUtc(termEnd, 24 * 60 - 1));
          lines.push(
            `RRULE:FREQ=WEEKLY;BYDAY=${days.map((d) => BYDAY[d]).join(",")};UNTIL=${until}`,
          );
          const skipped = off.filter((key) => {
            const day = new Date(key);
            return (
              day >= firstDay && days.some((d) => d + 1 === day.getUTCDay())
            );
          });
          if (skipped.length > 0) {
            lines.push(
              `EXDATE;TZID=${TZID}:${skipped
                .map((key) => toIcsLocal(new Date(key), parsed.startMinutes))
                .join(",")}`,
            );
          }
        }
        lines.push("END:VEVENT");
      }
    });
  }

  for (const exam of finals) {
    const day = parseDateOnly(exam.examDate);
    const startMinutes = minutesOf(exam.startsAt);
    const endMinutes = minutesOf(exam.endsAt);
    if (!day || startMinutes === null || endMinutes === null) continue;
    lines.push(
      "BEGIN:VEVENT",
      `UID:final-${exam.id}-${plan.termId}@room-tba`,
      `DTSTAMP:${dtStamp}`,
      `DTSTART;TZID=${TZID}:${toIcsLocal(day, startMinutes)}`,
      `DTEND;TZID=${TZID}:${toIcsLocal(day, endMinutes)}`,
      `SUMMARY:${escapeIcsText(`${exam.courseCode} Final Exam`)}`,
    );
    pushPlace(exam.roomCode, exam.roomId);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return `${lines.map(fold).join("\r\n")}\r\n`;
}
