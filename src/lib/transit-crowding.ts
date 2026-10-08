/**
 * "Likely busy" hint for a jeep stop. Two sources, strongest first:
 *
 * 1. Rider reports: several "It was full" taps in the last 20 minutes.
 * 2. An estimate: the minutes right after many classes end (or before many
 *    start) in buildings near the stop, and the usual weekday rush hours.
 *
 * The estimate is labelled as one wherever it is shown. Clock math runs on
 * campus time (Asia/Manila, UTC+8 all year: the Philippines has no DST), so
 * the hint is the same whatever time zone the phone is set to.
 */
import { termWindowStatus, type TermWindow } from "./academic-calendar";
import { FULL_REPORTS_FOR_BUSY } from "./transit-reports";
import { parseDays, parseScheduleTime } from "./schedule-renderer";

const CAMPUS_OFFSET_MS = 8 * 60 * 60_000;

/** Usual weekday rush windows, minutes since midnight campus time. */
export const RUSH_WINDOWS: readonly {
  start: number;
  end: number;
  label: string;
}[] = [
  { start: 7 * 60, end: 8 * 60, label: "7 to 8 AM" },
  { start: 12 * 60, end: 13 * 60, label: "12 to 1 PM" },
  { start: 16 * 60 + 30, end: 18 * 60, label: "4:30 to 6 PM" },
];

/** "Usually busy" shows from this long before a rush window opens. */
export const RUSH_LEAD_MINUTES = 30;
/** Minutes after a class end (or before a class start) that count as busy. */
export const CLASS_CHANGE_MINUTES = 10;
/** Sections ending (or starting) at once before it counts as a peak. */
export const CLASS_PEAK_MIN_SECTIONS = 5;
/** Buildings within this distance of a stop feed its class-change peaks. */
export const NEARBY_BUILDING_M = 200;

/** Campus weekday (0 = Monday ... 6 = Sunday) and minutes since midnight. */
export function campusClock(now: number): { day: number; minute: number } {
  const local = new Date(now + CAMPUS_OFFSET_MS);
  return {
    day: (local.getUTCDay() + 6) % 7,
    minute: local.getUTCHours() * 60 + local.getUTCMinutes(),
  };
}

/** Sections ending and starting at one time on one day (0 = Mon ... 5 = Sat). */
export type ClassChangePeak = {
  day: number;
  minute: number;
  ends: number;
  starts: number;
};

/**
 * Count section ends and starts per weekday and minute from raw AMIS schedule
 * strings ("MWF 10:00 AM-11:00 AM"), keeping the times busy enough to matter.
 * TBA and unparseable strings are skipped, never guessed.
 */
export function classChangePeaks(
  schedules: readonly (readonly string[] | null)[],
  minSections = CLASS_PEAK_MIN_SECTIONS,
): ClassChangePeak[] {
  const counts = new Map<string, ClassChangePeak>();
  const bump = (day: number, minute: number, field: "ends" | "starts") => {
    const key = `${day}:${minute}`;
    const entry = counts.get(key) ?? { day, minute, ends: 0, starts: 0 };
    entry[field] += 1;
    counts.set(key, entry);
  };
  for (const schedule of schedules) {
    for (const slot of schedule ?? []) {
      const parsed = parseScheduleTime(slot);
      if (!parsed) continue;
      for (const day of parseDays(parsed.days ?? "")) {
        bump(day, parsed.endMinutes, "ends");
        bump(day, parsed.startMinutes, "starts");
      }
    }
  }
  return [...counts.values()]
    .map((peak) => ({
      ...peak,
      ends: peak.ends >= minSections ? peak.ends : 0,
      starts: peak.starts >= minSections ? peak.starts : 0,
    }))
    .filter((peak) => peak.ends > 0 || peak.starts > 0)
    .sort((a, b) => a.day - b.day || a.minute - b.minute);
}

export type CrowdingHint = {
  text: string;
  /** "reports" is what riders said; "estimate" comes from schedules. */
  source: "reports" | "estimate";
};

export const CROWDING_ESTIMATE_NOTE =
  "Estimate from class times and usual rush hours";
export const CROWDING_REPORTS_NOTE = "From rider reports in the last 20 min";

/**
 * The hint for right now, or null when nothing suggests a crowd. Class peaks
 * only count while the term is in session (null window = unknown, skipped).
 */
export function crowdingHint(input: {
  now: number;
  peaks: readonly ClassChangePeak[];
  termWindow: TermWindow | null;
  fullReports: number;
}): CrowdingHint | null {
  if (input.fullReports >= FULL_REPORTS_FOR_BUSY) {
    return { text: "Busy: many jeeps reported full", source: "reports" };
  }

  const { day, minute } = campusClock(input.now);
  const inSession =
    input.termWindow !== null &&
    termWindowStatus(input.termWindow, new Date(input.now)) === "in-session";
  if (inSession) {
    const today = input.peaks.filter((peak) => peak.day === day);
    const ended = today.some(
      (peak) =>
        peak.ends > 0 &&
        minute >= peak.minute &&
        minute < peak.minute + CLASS_CHANGE_MINUTES,
    );
    if (ended) {
      return {
        text: "Likely busy now: classes just ended nearby",
        source: "estimate",
      };
    }
    const starting = today.some(
      (peak) =>
        peak.starts > 0 &&
        minute >= peak.minute - CLASS_CHANGE_MINUTES &&
        minute < peak.minute,
    );
    if (starting) {
      return {
        text: "Likely busy now: classes start soon nearby",
        source: "estimate",
      };
    }
  }

  if (day <= 4) {
    const rush = RUSH_WINDOWS.find(
      (window) =>
        minute >= window.start - RUSH_LEAD_MINUTES && minute < window.end,
    );
    if (rush) return { text: `Usually busy ${rush.label}`, source: "estimate" };
  }
  return null;
}
