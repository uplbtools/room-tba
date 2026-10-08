// Date-sensitive wiki content: decides at build time whether an event the
// page was written around has already happened, so the page can say so
// instead of reading as if the event were still ahead.

/** Last day of the UPCAT cycle the UPCAT article was written for. */
export const UPCAT_EXAM_LAST_DAY = "2026-08-02";

/**
 * True once `isoDay` (YYYY-MM-DD) is over in Manila time. The day itself still
 * counts as upcoming until midnight.
 */
export function hasDayPassed(isoDay: string, now: Date = new Date()): boolean {
  const endOfDay = Date.parse(`${isoDay}T23:59:59.999+08:00`);
  if (Number.isNaN(endOfDay)) throw new Error(`Bad date: ${isoDay}`);
  return now.getTime() > endOfDay;
}

export function formatLongDay(isoDay: string): string {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "long",
    timeZone: "Asia/Manila",
  }).format(new Date(`${isoDay}T12:00:00+08:00`));
}
