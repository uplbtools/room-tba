import { parseDays, parseScheduleTime } from "@lib/schedule-renderer";
import { sectionNaturalKey, type PlannedSection } from "./types.js";

export type ScheduleBlock = {
  dayIndex: number; // 0-5 = M-S
  startMin: number; // minutes since midnight
  endMin: number;
  courseCode: string;
  section: string;
  type: string;
};

/**
 * Parsed timetable blocks for one section. Empty for TBA or any format the
 * shared parser rejects — callers must surface those as "Unscheduled", never
 * drop them silently.
 */
export function sectionBlocks(section: PlannedSection): ScheduleBlock[] {
  const blocks: ScheduleBlock[] = [];
  for (const str of section.schedule ?? []) {
    const parsed = parseScheduleTime(str);
    if (!parsed) continue;
    for (const dayIndex of parseDays(parsed.days)) {
      blocks.push({
        dayIndex,
        startMin: parsed.startMinutes,
        endMin: parsed.endMinutes,
        courseCode: section.courseCode,
        section: section.section,
        type: section.type,
      });
    }
  }
  return blocks;
}

export function isUnscheduled(section: PlannedSection): boolean {
  return sectionBlocks(section).length === 0;
}

export type Conflict = { a: ScheduleBlock; b: ScheduleBlock };

/**
 * Pairwise overlaps: same day and strictly overlapping minute ranges.
 * Touching boundaries (10:00 end vs 10:00 start) do not conflict; a section
 * never conflicts with itself.
 */
export function findConflicts(sections: PlannedSection[]): Conflict[] {
  // ponytail: O(n²) over blocks — a plan tops out around ~30 blocks.
  const blocks = sections.flatMap((s) =>
    sectionBlocks(s).map((block) => ({ block, key: sectionNaturalKey(s) })),
  );
  const conflicts: Conflict[] = [];
  for (let i = 0; i < blocks.length; i++) {
    for (let j = i + 1; j < blocks.length; j++) {
      const a = blocks[i];
      const b = blocks[j];
      if (a.key === b.key) continue;
      if (
        a.block.dayIndex === b.block.dayIndex &&
        a.block.startMin < b.block.endMin &&
        b.block.startMin < a.block.endMin
      ) {
        conflicts.push({ a: a.block, b: b.block });
      }
    }
  }
  return conflicts;
}
