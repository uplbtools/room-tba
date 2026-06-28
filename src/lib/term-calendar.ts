import type { Term } from "@lib/types";

/** Official-ish AY 2025-2026 instructional windows (date-only, Asia/Manila). */
export const TERM_CALENDAR_WINDOWS: Record<
  number,
  { startsOn: string; endsOn: string }
> = {
  // CRS 1252 — midyear (Jun–Jul; schedules imported separately)
  1252: { startsOn: "2026-06-08", endsOn: "2026-07-26" },
  // CRS 1253 — UP second semester (Jan–May; production class rows live here)
  1253: { startsOn: "2026-01-19", endsOn: "2026-05-31" },
};

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
