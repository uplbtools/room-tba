// At-a-glance copy for the place sheet: the one-line facts under the title
// ("42 rooms, 3 classes now") and the landmark text under "How to find it".
// Pure so the sheet components stay thin and both are unit tested.

import { parseDays, parseScheduleTime } from "./schedule-renderer";

/**
 * Campus shorthand that first-time visitors do not know. The data keeps the
 * volunteers' wording ("left of OPark when facing the Oblation"), so the
 * sheet spells it out when it prints it.
 */
const ABBREVIATIONS: readonly [RegExp, string][] = [
  [/\bOPark\b/g, "Oblation Park"],
  [/\bOble\b/g, "the Oblation"],
];

export function expandCampusAbbreviations(text: string): string {
  let out = text;
  for (const [pattern, replacement] of ABBREVIATIONS) {
    out = out.replace(pattern, replacement);
  }
  // "of the the Oblation" when the source already said "the Oble".
  return out.replace(/\bthe the\b/gi, "the");
}

const MANILA_DAY: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

/** Day index (0 = Monday, matching parseDays) and minutes since midnight in Manila. */
export function manilaClock(now: Date): { dayIndex: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return {
    dayIndex: MANILA_DAY[get("weekday")] ?? 0,
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

/** How many classes are in session at `now` (Asia/Manila). TBA rows never count. */
export function countClassesNow(
  schedules: readonly (readonly string[] | null)[],
  now: Date = new Date(),
): number {
  const { dayIndex, minutes } = manilaClock(now);
  let count = 0;
  for (const schedule of schedules) {
    const inSession = (schedule ?? []).some((entry) => {
      const parsed = parseScheduleTime(entry);
      return (
        parsed !== null &&
        parseDays(parsed.days ?? "").includes(dayIndex) &&
        minutes >= parsed.startMinutes &&
        minutes < parsed.endMinutes
      );
    });
    if (inSession) count += 1;
  }
  return count;
}

function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}

/**
 * "17 rooms, 3 classes now". `classesNow` is null while the schedule is not
 * loaded (or never synced); then the term total stands in, and a building
 * with no class data at all shows only its rooms.
 */
export function buildingFactsLine(input: {
  roomCount: number | null;
  classesNow: number | null;
  classesThisTerm: number | null;
}): string | null {
  const bits: string[] = [];
  if (input.roomCount !== null && input.roomCount > 0) {
    bits.push(plural(input.roomCount, "room"));
  }
  if (input.classesNow !== null) {
    bits.push(
      input.classesNow === 0
        ? "no classes now"
        : `${plural(input.classesNow, "class", "classes")} now`,
    );
  } else if (input.classesThisTerm !== null && input.classesThisTerm > 0) {
    bits.push(`${plural(input.classesThisTerm, "class", "classes")} this term`);
  }
  return bits.length > 0 ? bits.join(", ") : null;
}
