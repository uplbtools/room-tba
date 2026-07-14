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

export function classesScheduleFreshnessMessage(
  importedAt: string | null | undefined,
  now = Date.now(),
): string | null {
  const label = formatClassesImportedAt(importedAt);
  if (!label) {
    return "Class schedule import date is unknown. Data may be outdated.";
  }
  if (isClassesScheduleStale(importedAt, now)) {
    return `Schedules last imported ${label}. Data may be outdated during COM.`;
  }
  return `Schedules updated ${label}.`;
}
