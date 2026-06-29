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

export function offeringGroupKey(
  courseCode: string | null | undefined,
  section: string | null | undefined,
): string | null {
  if (!courseCode || !section) return null;
  return `${courseCode}::${section}`;
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

  for (const group of groups.values()) {
    group.sections.sort((a, b) => {
      const ta = TYPE_ORDER[a.type ?? ""] ?? 9;
      const tb = TYPE_ORDER[b.type ?? ""] ?? 9;
      if (ta !== tb) return ta - tb;
      return (a.roomCode ?? "").localeCompare(b.roomCode ?? "");
    });
  }

  return [...groups.values()].sort((a, b) =>
    a.courseCode.localeCompare(b.courseCode),
  );
}
