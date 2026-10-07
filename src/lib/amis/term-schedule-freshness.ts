import {
  formatDateRange,
  toManilaDateKey,
  type ChangeOfMatriculationPeriod,
} from "@lib/term-calendar";

/** Days after import before class schedules are treated as stale (#318). */
export const CLASSES_SCHEDULE_STALE_DAYS = 14;

const importedAtFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export function formatClassesImportedAt(
  importedAt: string | null | undefined,
): string | null {
  if (!importedAt?.trim()) return null;
  const date = new Date(importedAt);
  if (Number.isNaN(date.getTime())) return null;
  return importedAtFormatter.format(date);
}

export function isClassesScheduleStale(
  importedAt: string | null | undefined,
  now = Date.now(),
): boolean {
  if (!importedAt?.trim()) return true;
  const date = new Date(importedAt);
  if (Number.isNaN(date.getTime())) return true;
  const ageMs = now - date.getTime();
  return ageMs > CLASSES_SCHEDULE_STALE_DAYS * 24 * 60 * 60 * 1000;
}

/**
 * Freshness line for class schedules. Given the term's change of
 * matriculation (COM) period, it names COM in full and says when it is:
 * ahead or under way (classes and rooms can still change), or already over
 * with the last import from before it ended (some may have changed since).
 */
export function classesScheduleFreshnessMessage(
  importedAt: string | null | undefined,
  now = Date.now(),
  com: ChangeOfMatriculationPeriod | null = null,
): string | null {
  const label = formatClassesImportedAt(importedAt);
  const today = toManilaDateKey(new Date(now));
  const range = com ? formatDateRange(com.startsOn, com.endsOn) : "";
  const importedOn =
    importedAt && label ? toManilaDateKey(new Date(importedAt)) : null;

  if (com && today <= com.endsOn) {
    const comNote =
      today >= com.startsOn
        ? `Change of matriculation (COM) is under way this semester (${range}); classes and rooms can still change.`
        : `Classes and rooms can still change during this semester's change of matriculation (COM), ${range}.`;
    return label
      ? `${isClassesScheduleStale(importedAt, now) ? "Schedules last imported" : "Schedules updated"} ${label}. ${comNote}`
      : `Class schedule import date is unknown. ${comNote}`;
  }
  if (com && importedOn && importedOn <= com.endsOn) {
    return `Schedules last imported ${label}, before this semester's change of matriculation (COM, ${range}) ended, so some classes or rooms may have changed.`;
  }
  if (!label) {
    return "Class schedule import date is unknown. Data may be outdated.";
  }
  if (isClassesScheduleStale(importedAt, now)) {
    return `Schedules last imported ${label}. Data may be outdated.`;
  }
  return `Schedules updated ${label}.`;
}
