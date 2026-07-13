import academicCalendar2024 from "../../data/academic-calendar-2024-2025.json";
import academicCalendar2026 from "../../data/academic-calendar-2026-2027.json";
import type { Term } from "@lib/types";

/** Hand-kept instructional windows (date-only, Asia/Manila) for AYs whose
 *  registrar calendar PDF has no text layer (2025-2026) or only OCR garbage
 *  (2023-2024). Finals windows verified against the finals-schedule PDFs in
 *  data/registrar/. */
export const TERM_CALENDAR_WINDOWS: Record<
  number,
  {
    startsOn: string;
    endsOn: string;
    finalsStartsOn?: string;
    finalsEndsOn?: string;
  }
> = {
  // CRS 1231 — AY 2023-2024 1st semester (Aug–Jan)
  1231: {
    startsOn: "2023-08-29",
    endsOn: "2024-01-11",
    finalsStartsOn: "2024-01-04",
    finalsEndsOn: "2024-01-11",
  },
  // CRS 1232 — AY 2023-2024 2nd semester (Feb–Jun)
  1232: {
    startsOn: "2024-02-05",
    endsOn: "2024-06-10",
    finalsStartsOn: "2024-06-03",
    finalsEndsOn: "2024-06-10",
  },
  // CRS 1252 — 2nd semester (Jan–May)
  1252: {
    startsOn: "2026-01-19",
    endsOn: "2026-05-31",
    finalsStartsOn: "2026-05-15",
    finalsEndsOn: "2026-05-22",
  },
  // CRS 1253 — midyear (Jun–Jul)
  1253: {
    startsOn: "2026-06-08",
    endsOn: "2026-07-26",
    finalsStartsOn: "2026-07-21",
    finalsEndsOn: "2026-07-25",
  },
};

/**
 * Last day of change of matriculation per term (Asia/Manila, date-only). Until
 * this date, course offerings can still change — surfaced in the planner note.
 */
export const CHANGE_OF_MATRICULATION_ENDS: Record<number, string> = {};

// AYs with a machine-readable registrar calendar PDF come straight from
// scripts/extract-academic-calendar-pdf.ts output.
for (const calendar of [academicCalendar2024, academicCalendar2026]) {
  for (const [termId, window] of Object.entries(calendar)) {
    TERM_CALENDAR_WINDOWS[Number(termId)] = {
      startsOn: window.startsOn,
      endsOn: window.endsOn,
      finalsStartsOn: window.finalsStartsOn,
      finalsEndsOn: window.finalsEndsOn,
    };
    CHANGE_OF_MATRICULATION_ENDS[Number(termId)] =
      window.changeOfMatriculationEndsOn;
  }
}

/** Human date ("August 7, 2026") for a term's last day of change of
 *  matriculation, or null when unknown. */
export function changeOfMatriculationLabel(
  termId: number | null | undefined,
): string | null {
  const iso = termId == null ? undefined : CHANGE_OF_MATRICULATION_ENDS[termId];
  if (!iso) return null;
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-PH", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function toManilaDateKey(date: Date) {
  return date.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
}

function termDateKey(value: string | null | undefined) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return toManilaDateKey(new Date(value));
}

/** True when `date` falls on an instructional day for the term (inclusive). */
export function isDateWithinTerm(
  term: Pick<Term, "startsOn" | "endsOn">,
  date: Date,
) {
  const day = toManilaDateKey(date);
  const start = termDateKey(term.startsOn);
  const end = termDateKey(term.endsOn);
  if (!start || !end) return false;
  return day >= start && day <= end;
}

function finalsWindowForTerm(term: Pick<Term, "id">) {
  return TERM_CALENDAR_WINDOWS[term.id];
}

/** True when `date` falls within the configured finals window for the term. */
export function isFinalsWeek(
  date: Date,
  term: Pick<Term, "id" | "startsOn" | "endsOn">,
) {
  const window = finalsWindowForTerm(term);
  if (!window?.finalsStartsOn || !window.finalsEndsOn) return false;
  const day = toManilaDateKey(date);
  return day >= window.finalsStartsOn && day <= window.finalsEndsOn;
}

/** Pick the active term for a calendar day; null when between terms. */
export function resolveActiveTermByDate<T extends Term>(
  terms: T[],
  date = new Date(),
): T | null {
  const active = terms.filter(
    (term) => term.isActive && isDateWithinTerm(term, date),
  );
  if (active.length === 0) return null;
  return (
    active.sort((a, b) => b.sortOrder - a.sortOrder || b.id - a.id)[0] ?? null
  );
}

/** Default term for visitors: in-session window, then legacy flag, then newest active. */
export function resolveDefaultTermFromList<T extends TermPick>(
  terms: T[],
  date = new Date(),
): T | null {
  const calendarTerm = resolveActiveTermByDate(terms, date);
  if (calendarTerm) {
    if ((calendarTerm.classCount ?? 0) > 0) return calendarTerm;
    return pickTermWithClasses(terms) ?? calendarTerm;
  }

  return (
    terms.find((term) => term.isDefault && term.isActive) ??
    pickTermWithClasses(terms) ??
    terms.find((term) => term.isActive) ??
    terms[0] ??
    null
  );
}

type TermPick = Term & { classCount?: number };

function isStoredTermUsable(term: TermPick | undefined) {
  if (!term) return false;
  if ((term.classCount ?? 0) > 0) return true;
  return term.startsOn != null && term.endsOn != null;
}

function pickTermWithClasses<T extends TermPick>(terms: T[]): T | null {
  return (
    terms
      .filter((term) => term.isActive && (term.classCount ?? 0) > 0)
      .sort((a, b) => b.sortOrder - a.sortOrder || b.id - a.id)[0] ?? null
  );
}

/**
 * Resolve the interactive term on load.
 * URL wins; stale local picks (no classes / undated 1251-era rows) lose to the
 * calendar default; otherwise honor a prior manual selection.
 */
export function resolveInitialTermId(
  terms: TermPick[],
  options: {
    fromUrl: number | null;
    storedId: number | null;
    date?: Date;
  },
): number | null {
  const urlValid =
    options.fromUrl !== null &&
    terms.some((term) => term.id === options.fromUrl);
  if (urlValid) return options.fromUrl;

  const calendarDefault = resolveActiveTermByDate(terms, options.date);
  const storedTerm =
    options.storedId !== null
      ? terms.find((term) => term.id === options.storedId)
      : undefined;
  const storedValid = storedTerm !== undefined;

  if (calendarDefault) {
    if (!storedValid || !isStoredTermUsable(storedTerm)) {
      if ((calendarDefault.classCount ?? 0) > 0) return calendarDefault.id;
      return pickTermWithClasses(terms)?.id ?? calendarDefault.id;
    }
    return options.storedId;
  }

  const fallback = resolveDefaultTermFromList(terms, options.date);
  if (storedValid) return options.storedId;
  return fallback?.id ?? null;
}

/** "Dec 1 – Dec 7" official finals window for a term, or null when unknown. */
export function finalsWindowLabel(termId: number | null | undefined) {
  const window = termId == null ? undefined : TERM_CALENDAR_WINDOWS[termId];
  if (!window?.finalsStartsOn || !window.finalsEndsOn) return null;
  return formatTermDateRange({
    startsOn: window.finalsStartsOn,
    endsOn: window.finalsEndsOn,
  });
}

export function formatTermDateRange(term: Pick<Term, "startsOn" | "endsOn">) {
  const start = termDateKey(term.startsOn);
  const end = termDateKey(term.endsOn);
  if (!start || !end) return null;

  const startLabel = formatShortDate(start);
  const endLabel = formatShortDate(end);
  return `${startLabel} – ${endLabel}`;
}

function formatShortDate(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
