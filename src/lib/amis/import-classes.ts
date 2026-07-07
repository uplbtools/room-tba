import type { NormalizedAmisClass } from "./types";
import { normalizeFacilityKey } from "./normalize-class";
import { isRoomScheduledClassType } from "./room-scheduled-types";

export type ClassInsertRow = {
  courseCode: string;
  section: string;
  type: string | null;
  courseTitle: string | null;
  schedule: string[];
  roomId: number | null;
  termId: number;
};

export type ImportRowStats = {
  directRoomMatch: number;
  aliasRoomMatch: number;
  missingFacility: number;
  unmatchedFacility: number;
  skippedByType: number;
};

export type ImportRowOutcome =
  | { kind: "insert"; row: ClassInsertRow }
  | { kind: "skip-type"; type: string }
  | { kind: "skip-missing-facility" }
  | { kind: "skip-unmatched-facility"; facility: string };

export type ImportChangeSummary = {
  inserted: number;
  updated: number;
  unchanged: number;
  removed: number;
};

export function classNaturalKey(row: {
  termId: number;
  courseCode: string;
  section: string | null | undefined;
  type: string | null | undefined;
}) {
  return [
    row.termId,
    row.courseCode.trim().toUpperCase(),
    (row.section ?? "").trim().toUpperCase(),
    (row.type ?? "").trim().toUpperCase(),
  ].join("|");
}

export function buildRoomLookup(
  rooms: { id: number; code: string }[],
  roomAliases: { alias: string; targetId: number }[],
) {
  const directRoomIdByKey = new Map<string, number>();
  const aliasRoomIdByKey = new Map<string, number>();
  for (const room of rooms) {
    directRoomIdByKey.set(normalizeFacilityKey(room.code), room.id);
  }
  for (const alias of roomAliases) {
    aliasRoomIdByKey.set(normalizeFacilityKey(alias.alias), alias.targetId);
  }
  const combinedRoomIdByKey = new Map([
    ...directRoomIdByKey,
    ...aliasRoomIdByKey,
  ]);
  return { directRoomIdByKey, aliasRoomIdByKey, combinedRoomIdByKey };
}

export function resolveImportRows(
  normalized: NormalizedAmisClass[],
  lookup: ReturnType<typeof buildRoomLookup>,
): {
  rows: ClassInsertRow[];
  stats: ImportRowStats;
  unmatched: Map<string, number>;
} {
  const stats: ImportRowStats = {
    directRoomMatch: 0,
    aliasRoomMatch: 0,
    missingFacility: 0,
    unmatchedFacility: 0,
    skippedByType: 0,
  };
  const unmatched = new Map<string, number>();
  const rows: ClassInsertRow[] = [];

  for (const row of normalized) {
    if (!isRoomScheduledClassType(row.type)) {
      stats.skippedByType += 1;
      continue;
    }

    const facility = row.facilityCode?.trim();
    let roomId: number | null = null;
    if (!facility) {
      stats.missingFacility += 1;
      unmatched.set(
        "(missing facility)",
        (unmatched.get("(missing facility)") ?? 0) + 1,
      );
    } else {
      const key = normalizeFacilityKey(facility);
      roomId = lookup.combinedRoomIdByKey.get(key) ?? null;
      if (roomId == null) {
        stats.unmatchedFacility += 1;
        unmatched.set(facility, (unmatched.get(facility) ?? 0) + 1);
      } else if (lookup.directRoomIdByKey.has(key)) {
        stats.directRoomMatch += 1;
      } else {
        stats.aliasRoomMatch += 1;
      }
    }

    rows.push({
      courseCode: row.courseCode,
      section: row.section,
      type: row.type,
      courseTitle: row.courseTitle,
      schedule: row.schedule,
      roomId,
      termId: row.termId,
    });
  }

  return { rows, stats, unmatched };
}

export function summarizeImportChanges(input: {
  replaceTerm: boolean;
  existingKeys: Set<string>;
  incomingRows: ClassInsertRow[];
  existingByKey: Map<
    string,
    {
      id: number;
      courseCode: string | null;
      section: string | null;
      type: string | null;
      courseTitle: string | null;
      schedule: string[] | null;
      roomId: number | null;
    }
  >;
}): {
  summary: ImportChangeSummary;
  inserts: ClassInsertRow[];
  updates: Array<{ id: number; row: ClassInsertRow }>;
  removeIds: number[];
} {
  const incomingByKey = new Map<string, ClassInsertRow>();
  for (const row of input.incomingRows) {
    incomingByKey.set(classNaturalKey(row), row);
  }

  let inserted = 0;
  let updated = 0;
  let unchanged = 0;
  const inserts: ClassInsertRow[] = [];
  const updates: Array<{ id: number; row: ClassInsertRow }> = [];
  const removeIds: number[] = [];

  for (const [key, row] of incomingByKey) {
    const existing = input.existingByKey.get(key);
    if (!existing) {
      inserted += 1;
      inserts.push(row);
      continue;
    }

    const changed =
      existing.courseCode !== row.courseCode ||
      existing.section !== row.section ||
      existing.type !== row.type ||
      existing.courseTitle !== row.courseTitle ||
      existing.roomId !== row.roomId ||
      JSON.stringify(existing.schedule ?? []) !== JSON.stringify(row.schedule);

    if (changed) {
      updated += 1;
      updates.push({ id: existing.id, row });
    } else {
      unchanged += 1;
    }
  }

  if (input.replaceTerm) {
    for (const [key, existing] of input.existingByKey) {
      if (!incomingByKey.has(key)) {
        removeIds.push(existing.id);
      }
    }
  }

  return {
    summary: {
      inserted,
      updated,
      unchanged,
      removed: removeIds.length,
    },
    inserts,
    updates,
    removeIds,
  };
}

export function formatImportReport(input: {
  termId: number;
  rawCount: number;
  normalizedCount: number;
  stats: ImportRowStats;
  summary: ImportChangeSummary;
  unmatched: Map<string, number>;
}) {
  const lines: string[] = [
    `AMIS import summary (term_id=${input.termId})`,
    `  Raw rows: ${input.rawCount}`,
    `  Normalized: ${input.normalizedCount}`,
    `  Room matches: ${input.stats.directRoomMatch} direct, ${input.stats.aliasRoomMatch} via alias`,
    `  Skipped by type: ${input.stats.skippedByType}`,
    `  Missing facility: ${input.stats.missingFacility}`,
    `  Unmatched facility: ${input.stats.unmatchedFacility}`,
    `  DB changes: +${input.summary.inserted} ~${input.summary.updated} =${input.summary.unchanged} -${input.summary.removed}`,
  ];

  if (input.unmatched.size > 0) {
    lines.push("  Top unmatched facilities:");
    for (const [facility, count] of [...input.unmatched.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)) {
      lines.push(`    ${count}× ${facility}`);
    }
  }

  return lines.join("\n");
}
