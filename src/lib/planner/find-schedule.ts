import type { ClassMapValue } from "@lib/types";
import type { ClassOfferingGroup } from "../class-offering-groups.js";
import { alternativeOfferings } from "./alternatives.js";
import { overlaps, sectionBlocks, type ScheduleBlock } from "./conflicts.js";

export type ScheduleFilters = {
  /** Minutes since midnight. */
  notBefore: number | null;
  /** Day index 0-5 (M-S), or "any" weekday Mon-Fri. */
  freeDay: number | "any" | null;
  lunch: { startMin: number; endMin: number } | null;
  /** Walking minutes between two room codes, or null to skip the check. */
  walkMinutes: ((from: string, to: string) => number) | null;
};

export type FoundSchedule = {
  offerings: ClassOfferingGroup[];
  violations: number;
  earlyStarts: number;
  gapMinutes: number;
};

export type FindResult = {
  schedules: FoundSchedule[];
  /** Courses with no offering in the loaded rows. */
  missing: string[];
  capped: boolean;
};

export const MAX_RESULTS = 200;
export const MAX_NODES = 50_000;
const MAX_VIOLATIONS = 3;
const ENOUGH_RESULTS = 10;
const EARLY_START_MIN = 8 * 60;
// A walk longer than this is never the reason a class pair fails.
const WALK_LOOKAHEAD_MIN = 30;

type RoomBlock = ScheduleBlock & { room: string | null };
type Candidate = { group: ClassOfferingGroup; blocks: RoomBlock[] };

function candidate(group: ClassOfferingGroup): Candidate {
  return {
    group,
    blocks: group.sections.flatMap((row) =>
      sectionBlocks({
        courseCode: row.courseCode ?? "",
        section: row.section ?? "",
        type: row.type ?? "",
        schedule: row.schedule ?? [],
        roomCode: row.roomCode,
        courseTitle: null,
      }).map((block) => ({ ...block, room: row.roomCode })),
    ),
  };
}

function freeDayBroken(mask: number, freeDay: ScheduleFilters["freeDay"]) {
  if (freeDay === null) return false;
  if (freeDay === "any") return (mask & 31) === 31;
  return (mask & (1 << freeDay)) !== 0;
}

/** Adds blocks to the placed ones, or returns null on a time overlap. */
function place(
  placed: RoomBlock[],
  mask: number,
  blocks: RoomBlock[],
  filters: ScheduleFilters,
): { placed: RoomBlock[]; mask: number; cost: number } | null {
  const next = [...placed];
  let nextMask = mask;
  let cost = 0;
  for (const block of blocks) {
    if (filters.notBefore !== null && block.startMin < filters.notBefore) {
      cost++;
    }
    if (
      filters.lunch &&
      block.startMin < filters.lunch.endMin &&
      filters.lunch.startMin < block.endMin
    ) {
      cost++;
    }
    for (const other of next) {
      if (other.dayIndex !== block.dayIndex) continue;
      if (overlaps(other, block)) return null;
      const [from, to] =
        other.endMin <= block.startMin ? [other, block] : [block, other];
      const gap = to.startMin - from.endMin;
      if (
        filters.walkMinutes &&
        from.room &&
        to.room &&
        gap < WALK_LOOKAHEAD_MIN &&
        filters.walkMinutes(from.room, to.room) > gap
      ) {
        cost++;
      }
    }
    const withBlock = nextMask | (1 << block.dayIndex);
    if (
      !freeDayBroken(nextMask, filters.freeDay) &&
      freeDayBroken(withBlock, filters.freeDay)
    ) {
      cost++;
    }
    nextMask = withBlock;
    next.push(block);
  }
  return { placed: next, mask: nextMask, cost };
}

function measure(placed: RoomBlock[]) {
  let earlyStarts = 0;
  let gapMinutes = 0;
  for (let day = 0; day < 6; day++) {
    const blocks = placed
      .filter((b) => b.dayIndex === day)
      .sort((a, b) => a.startMin - b.startMin);
    if (blocks.length === 0) continue;
    if (blocks[0].startMin < EARLY_START_MIN) earlyStarts++;
    for (let i = 1; i < blocks.length; i++) {
      gapMinutes += Math.max(0, blocks[i].startMin - blocks[i - 1].endMin);
    }
  }
  return { earlyStarts, gapMinutes };
}

/**
 * Every combination of one offering per course with no time overlap, best
 * first. A filter a schedule breaks counts as a violation instead of removing
 * it, so tight filters still return the closest schedules.
 */
export function findSchedules(
  rows: ClassMapValue[],
  courseCodes: string[],
  filters: ScheduleFilters,
): FindResult {
  const codes = [...new Set(courseCodes)];
  const missing: string[] = [];
  const courses: Candidate[][] = [];
  for (const code of codes) {
    const options = alternativeOfferings(rows, code, "").map(candidate);
    if (options.length === 0) missing.push(code);
    else courses.push(options);
  }
  // Fewest options first, so dead ends are hit early.
  courses.sort((a, b) => a.length - b.length);

  let capped = false;
  const schedules: FoundSchedule[] = [];
  for (let budget = 0; budget <= MAX_VIOLATIONS; budget++) {
    schedules.length = 0;
    capped = false;
    let nodes = 0;
    const chosen: Candidate[] = [];
    const walk = (
      depth: number,
      placed: RoomBlock[],
      mask: number,
      cost: number,
    ) => {
      if (schedules.length >= MAX_RESULTS || nodes >= MAX_NODES) {
        capped = true;
        return;
      }
      if (depth === courses.length) {
        const offerings = chosen
          .map((c) => c.group)
          .sort(
            (a, b) => codes.indexOf(a.courseCode) - codes.indexOf(b.courseCode),
          );
        schedules.push({ offerings, violations: cost, ...measure(placed) });
        return;
      }
      for (const option of courses[depth]) {
        nodes++;
        const next = place(placed, mask, option.blocks, filters);
        if (!next || cost + next.cost > budget) continue;
        chosen.push(option);
        walk(depth + 1, next.placed, next.mask, cost + next.cost);
        chosen.pop();
      }
    };
    walk(0, [], 0, 0);
    if (schedules.length >= ENOUGH_RESULTS) break;
  }

  schedules.sort(
    (a, b) =>
      a.violations - b.violations ||
      a.earlyStarts - b.earlyStarts ||
      a.gapMinutes - b.gapMinutes,
  );
  return { schedules, missing, capped };
}
