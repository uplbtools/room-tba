import {
  TERM_CALENDAR_WINDOWS,
  termDateKey,
  toManilaDateKey,
} from "./term-calendar";
import type { Term } from "@lib/types";

/**
 * Timeline math for the academic calendar viewer (#408). Instructional
 * windows only — holidays/enrollment/exam weeks need a trusted source and are
 * deliberately out of scope.
 */

export type TermWindow = { startsOn: string; endsOn: string };
export type TermStatus = "past" | "in-session" | "upcoming";

type DatableTerm = Pick<Term, "id" | "startsOn" | "endsOn">;

/** DB `starts_on`/`ends_on` win; hand-kept constants fill gaps (#335). */
export function resolveTermWindow(term: DatableTerm): TermWindow | null {
  const start = termDateKey(term.startsOn);
  const end = termDateKey(term.endsOn);
  if (start && end) return { startsOn: start, endsOn: end };
  const fallback = TERM_CALENDAR_WINDOWS[term.id];
  if (fallback) {
    return { startsOn: fallback.startsOn, endsOn: fallback.endsOn };
  }
  return null;
}

/** Where `today` (Asia/Manila) falls relative to a term window (inclusive). */
export function termWindowStatus(window: TermWindow, today: Date): TermStatus {
  const day = toManilaDateKey(today);
  if (day < window.startsOn) return "upcoming";
  if (day > window.endsOn) return "past";
  return "in-session";
}

const DAY_MS = 86_400_000;

function dayNumber(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return Date.UTC(year, month - 1, day) / DAY_MS;
}

function monthStart(isoDate: string) {
  return `${isoDate.slice(0, 7)}-01`;
}

function monthEnd(isoDate: string) {
  const [year, month] = isoDate.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${isoDate.slice(0, 7)}-${String(lastDay).padStart(2, "0")}`;
}

function nextMonthStart(isoDate: string) {
  const [year, month] = isoDate.split("-").map(Number);
  // month is 1-based here, so passing it to 0-based Date.UTC lands next month.
  return new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
}

function shortMonthLabel(isoDate: string) {
  const [year, month] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-PH", {
    month: "short",
    timeZone: "UTC",
  });
}

export type TimelineSegment<T extends DatableTerm = DatableTerm> = {
  term: T;
  window: TermWindow;
  status: TermStatus;
  /** Left edge of the term bar, 0–100 within the strip. */
  startPct: number;
  widthPct: number;
};

export type YearTimeline<T extends DatableTerm = DatableTerm> = {
  /** First day of the first month shown / last day of the last month shown. */
  rangeStart: string;
  rangeEnd: string;
  /** Center of today's cell, or null when today is outside the strip. */
  todayPct: number | null;
  months: { label: string; startPct: number }[];
  segments: TimelineSegment<T>[];
};

/**
 * Percentage positions for term windows on a single strip, padded to month
 * boundaries so the strip reads like a calendar year.
 */
export function buildYearTimeline<T extends DatableTerm>(
  terms: T[],
  today = new Date(),
): YearTimeline<T> | null {
  const dated = terms
    .map((term) => ({ term, window: resolveTermWindow(term) }))
    .filter((entry): entry is { term: T; window: TermWindow } =>
      Boolean(entry.window),
    )
    .sort((a, b) => a.window.startsOn.localeCompare(b.window.startsOn));
  if (dated.length === 0) return null;

  const rangeStart = monthStart(dated[0].window.startsOn);
  const rangeEnd = monthEnd(
    dated.reduce(
      (max, entry) => (entry.window.endsOn > max ? entry.window.endsOn : max),
      dated[0].window.endsOn,
    ),
  );

  const startDay = dayNumber(rangeStart);
  const totalDays = dayNumber(rangeEnd) - startDay + 1;
  const pctAt = (isoDate: string) =>
    ((dayNumber(isoDate) - startDay) / totalDays) * 100;

  const segments = dated.map(({ term, window }) => ({
    term,
    window,
    status: termWindowStatus(window, today),
    startPct: pctAt(window.startsOn),
    widthPct:
      ((dayNumber(window.endsOn) - dayNumber(window.startsOn) + 1) /
        totalDays) *
      100,
  }));

  const months: YearTimeline["months"] = [];
  for (
    let cursor = rangeStart;
    cursor <= rangeEnd;
    cursor = nextMonthStart(cursor)
  ) {
    months.push({ label: shortMonthLabel(cursor), startPct: pctAt(cursor) });
  }

  const todayKey = toManilaDateKey(today);
  const todayPct =
    todayKey >= rangeStart && todayKey <= rangeEnd
      ? ((dayNumber(todayKey) - startDay + 0.5) / totalDays) * 100
      : null;

  return { rangeStart, rangeEnd, todayPct, months, segments };
}

/**
 * Grid step for event markers, in strip percent. The narrowest strip we support
 * is ~296px (320px viewport), where 5% is ~15px — wider than the 12px marker,
 * so two markers can never touch.
 *
 * ponytail: fixed grid, no layout measuring. Events inside the same cell
 * collapse into one dot-with-count instead of stacking; pass a step derived
 * from the measured strip width if markers ever need day-level precision.
 */
export const EVENT_MARKER_STEP_PCT = 5;

/** Manila day keys (YYYY-MM-DD) for one event occurrence. */
type EventDays = { startsOn: string; endsOn: string };

export type EventMarker<E> = {
  /** Center of the marker's grid cell, 0–100 within the strip. */
  leftPct: number;
  events: E[];
};

export type EventMonthGroup<E> = {
  /** "2026-08" */
  key: string;
  /** "Aug 2026" */
  label: string;
  events: E[];
};

export type EventTimeline<E> = {
  markers: EventMarker<E>[];
  months: EventMonthGroup<E>[];
  /** Events whose occurrence misses the strip; surfaced, not silently dropped. */
  outOfRangeCount: number;
};

function isoFromDayNumber(day: number) {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

/**
 * Place event occurrences on the year strip built by `buildYearTimeline`, and
 * group them by month for the list under it.
 */
export function buildEventTimeline<E extends EventDays>(
  strip: Pick<YearTimeline, "rangeStart" | "rangeEnd">,
  events: E[],
  stepPct = EVENT_MARKER_STEP_PCT,
): EventTimeline<E> {
  const startDay = dayNumber(strip.rangeStart);
  const totalDays = dayNumber(strip.rangeEnd) - startDay + 1;
  const cells = Math.ceil(100 / stepPct);

  // Overlap, not containment: an event that started before the strip but runs
  // into it still belongs to this year — pin it to the first day shown.
  const placed = events
    .filter(
      (event) =>
        event.startsOn <= strip.rangeEnd && event.endsOn >= strip.rangeStart,
    )
    .map((event) => ({
      event,
      day: Math.max(dayNumber(event.startsOn), startDay),
    }))
    .sort((a, b) => a.day - b.day);

  const markers: EventMarker<E>[] = [];
  const months: EventMonthGroup<E>[] = [];
  let marker: EventMarker<E> | null = null;
  let month: EventMonthGroup<E> | null = null;
  let cell = -1;

  for (const { event, day } of placed) {
    const dayPct = ((day - startDay) / totalDays) * 100;
    const nextCell = Math.min(Math.floor(dayPct / stepPct), cells - 1);
    if (!marker || nextCell !== cell) {
      cell = nextCell;
      marker = {
        leftPct: Math.min((cell + 0.5) * stepPct, 100 - stepPct / 2),
        events: [],
      };
      markers.push(marker);
    }
    marker.events.push(event);

    const key = isoFromDayNumber(day).slice(0, 7);
    if (!month || month.key !== key) {
      month = {
        key,
        label: `${shortMonthLabel(`${key}-01`)} ${key.slice(0, 4)}`,
        events: [],
      };
      months.push(month);
    }
    month.events.push(event);
  }

  return { markers, months, outOfRangeCount: events.length - placed.length };
}

type CalendarTerm = DatableTerm &
  Pick<Term, "schoolYear" | "isActive" | "sortOrder">;

/**
 * Terms shown on the year strip: the academic year in session today, the next
 * upcoming AY between terms, or the most recent one when everything is past.
 */
export function currentAcademicYearTerms<T extends CalendarTerm>(
  terms: T[],
  today = new Date(),
): T[] {
  const dated = terms
    .filter((term) => term.isActive)
    .map((term) => ({ term, window: resolveTermWindow(term) }))
    .filter((entry): entry is { term: T; window: TermWindow } =>
      Boolean(entry.window),
    );
  if (dated.length === 0) return [];

  // Same tie-break as resolveActiveTermByDate: newest sortOrder, then id.
  const inSession = dated
    .filter((entry) => termWindowStatus(entry.window, today) === "in-session")
    .sort(
      (a, b) => b.term.sortOrder - a.term.sortOrder || b.term.id - a.term.id,
    )[0];
  const upcoming = dated
    .filter((entry) => termWindowStatus(entry.window, today) === "upcoming")
    .sort((a, b) => a.window.startsOn.localeCompare(b.window.startsOn))[0];
  const latest = [...dated].sort((a, b) =>
    b.window.endsOn.localeCompare(a.window.endsOn),
  )[0];

  const anchor = inSession ?? upcoming ?? latest;
  const ay = anchor.term.schoolYear;
  if (!ay) return [anchor.term];
  return dated
    .filter((entry) => entry.term.schoolYear === ay)
    .map((entry) => entry.term);
}
