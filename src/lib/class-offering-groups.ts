import type { ClassMapValue } from "@lib/types";

export type ClassOfferingGroup = {
  key: string;
  courseCode: string;
  courseTitle: string | null;
  section: string;
  sections: ClassMapValue[];
};

const TYPE_ORDER: Record<string, number> = {
  LEC: 0,
  LAB: 1,
  SEM: 2,
};

function classType(row: ClassMapValue): string {
  return (row.type ?? "").trim().toUpperCase();
}

export function parentLectureSection(row: ClassMapValue): string | null {
  if (!row.section) return null;
  const section = row.section.trim().toUpperCase();
  // A lab or recit section encodes its parent lecture as the prefix before its
  // numbered slot: "G-1L"/"UV-1R" (dashed) or "ST11L" (compact). Any trailing
  // letter run marks a child (L = lab, R = recit, …), so match [A-Z]+ not just
  // "L". The prefix is everything up to the dash/number, which preserves
  // multi-letter lecture codes like "UV". Not gated on type: recits are not
  // typed "LAB", and the section shape alone identifies a child.
  const hyphenated = section.match(/^(.+)-\d+[A-Z]+$/);
  if (hyphenated?.[1]) return hyphenated[1];
  const compact = section.match(/^(.+)\d[A-Z]+$/);
  return compact?.[1] ?? null;
}

export function offeringGroupKey(
  courseCode: string | null | undefined,
  section: string | null | undefined,
): string | null {
  if (!courseCode || !section) return null;
  return `${courseCode}::${section}`;
}

/**
 * Parent-lecture (courseCode, section) pairs that a lab/recit in `classes`
 * points to but that aren't present — e.g. in a room view, the lecture meets
 * in a different room so it isn't in that room's class list. Callers fetch
 * these and merge them in so groupClassesByOffering can attach the lecture.
 */
export function missingParentLectures(
  classes: ClassMapValue[],
): { courseCode: string; section: string }[] {
  const presentLectures = new Set(
    classes
      .filter((row) => classType(row) === "LEC")
      .map(
        (row) =>
          `${row.courseCode}::${(row.section ?? "").trim().toUpperCase()}`,
      ),
  );
  const seen = new Set<string>();
  const out: { courseCode: string; section: string }[] = [];
  for (const row of classes) {
    const section = parentLectureSection(row);
    if (!section || !row.courseCode) continue;
    const key = `${row.courseCode}::${section}`;
    if (presentLectures.has(key) || seen.has(key)) continue;
    seen.add(key);
    out.push({ courseCode: row.courseCode, section });
  }
  return out;
}

/** Group LEC/LAB/SEM rows that share course code + section (#301). */
export function groupClassesByOffering(
  classes: ClassMapValue[],
): ClassOfferingGroup[] {
  const groups = new Map<string, ClassOfferingGroup>();

  for (const row of classes) {
    const key = offeringGroupKey(row.courseCode, row.section);
    if (!key) {
      groups.set(`__solo__${row.id}`, {
        key: `__solo__${row.id}`,
        courseCode: row.courseCode ?? "Class",
        courseTitle: row.courseTitle,
        section: row.section ?? "",
        sections: [row],
      });
      continue;
    }

    const existing = groups.get(key);
    if (existing) {
      existing.sections.push(row);
      if (!existing.courseTitle && row.courseTitle) {
        existing.courseTitle = row.courseTitle;
      }
    } else {
      groups.set(key, {
        key,
        courseCode: row.courseCode!,
        courseTitle: row.courseTitle,
        section: row.section!,
        sections: [row],
      });
    }
  }

  const linkedLectureKeys = new Set<string>();
  for (const group of groups.values()) {
    const linkedLectures = new Map<number, ClassMapValue>();
    for (const row of group.sections) {
      const parentSection = parentLectureSection(row);
      const parentKey = offeringGroupKey(row.courseCode, parentSection);
      const parent = parentKey ? groups.get(parentKey) : null;
      if (!parent || parent === group) continue;
      for (const parentRow of parent.sections) {
        if (classType(parentRow) === "LEC") {
          linkedLectures.set(parentRow.id, parentRow);
        }
      }
      if (linkedLectures.size > 0) linkedLectureKeys.add(parent.key);
    }
    group.sections.unshift(...linkedLectures.values());
  }

  for (const group of groups.values()) {
    group.sections.sort((a, b) => {
      const ta = TYPE_ORDER[classType(a)] ?? 9;
      const tb = TYPE_ORDER[classType(b)] ?? 9;
      if (ta !== tb) return ta - tb;
      return (a.roomCode ?? "").localeCompare(b.roomCode ?? "");
    });
  }

  return [...groups.values()]
    .filter(
      (group) =>
        !linkedLectureKeys.has(group.key) ||
        group.sections.some((row) => classType(row) !== "LEC"),
    )
    .sort((a, b) => a.courseCode.localeCompare(b.courseCode));
}
