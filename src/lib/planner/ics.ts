import { parseDays, parseScheduleTime } from "@lib/schedule-renderer";
import { sectionNaturalKey, type PlannerPlan } from "./types.js";

// Manila is UTC+8 with no DST, so events are emitted as fixed UTC times and
// no VTIMEZONE block is needed.
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

/**
 * Build an iCalendar string for a plan: one weekly-recurring VEVENT per
 * parsed schedule string, bounded by the term window. TBA/unparseable
 * schedules are skipped. `now` anchors the fallback when term dates are
 * missing.
 */
export function buildPlanIcs(
  plan: PlannerPlan,
  term: IcsTermWindow | null,
  now: Date = new Date(),
): string {
  const termStart = parseDateOnly(term?.startsOn);
  const termEnd = parseDateOnly(term?.endsOn);
  // ponytail: without term dates, emit one non-recurring week from `now` —
  // upgrade path is filling starts_on/ends_on on the terms table.
  const rangeStart =
    termStart ??
    new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
  const dtStamp = toIcsUtc(now);

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Room TBA//Course Planner//EN",
  ];

  for (const section of plan.sections) {
    for (const scheduleStr of section.schedule ?? []) {
      const parsed = parseScheduleTime(scheduleStr);
      if (!parsed) continue;
      const dayIndices = parseDays(parsed.days).filter(
        (d) => d >= 0 && d < BYDAY.length,
      );
      if (dayIndices.length === 0) continue;

      const summary = escapeIcsText(
        `${section.courseCode} ${section.type} ${section.section}`,
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
          `UID:${encodeURIComponent(sectionNaturalKey(section))}-${plan.termId}-${days.join("")}@room-tba`,
          `DTSTAMP:${dtStamp}`,
          `DTSTART:${toIcsUtc(manilaToUtc(firstDay, parsed.startMinutes))}`,
          `DTEND:${toIcsUtc(manilaToUtc(firstDay, parsed.endMinutes))}`,
          `SUMMARY:${summary}`,
        );
        if (section.roomCode) {
          lines.push(`LOCATION:${escapeIcsText(section.roomCode)}`);
        }
        if (termEnd) {
          // End of the last term day in Manila time, expressed as UTC.
          const until = toIcsUtc(manilaToUtc(termEnd, 24 * 60 - 1));
          lines.push(
            `RRULE:FREQ=WEEKLY;BYDAY=${days.map((d) => BYDAY[d]).join(",")};UNTIL=${until}`,
          );
        }
        lines.push("END:VEVENT");
      }
    }
  }

  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}
