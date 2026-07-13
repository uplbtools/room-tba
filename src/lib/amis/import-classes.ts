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
  fuzzyRoomMatch: number;
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

// AMIS/registrar venues are free-typed strings, so exact keys miss spacing,
// abbreviation, and punctuation variants ("IBSLH 2" vs "IBSLH2", "CHE CONF RM"
// vs "CHE Conference Room"). Fuzzy tiers below recover those; truly irregular
// names persist as rows in the aliases table (targetType='room').
const FACILITY_ABBREVIATIONS: [RegExp, string][] = [
  [/\bRM\b/g, "ROOM"],
  [/\bCONF\b/g, "CONFERENCE"],
  [/\bAUD\b/g, "AUDI"],
  [/\bGRAD\b/g, "GRADUATE"],
];

function expandFacilityAbbreviations(key: string) {
  let expanded = key;
  for (const [pattern, replacement] of FACILITY_ABBREVIATIONS) {
    expanded = expanded.replace(pattern, replacement);
  }
  return expanded;
}

/** Alphanumerics only — collapses every spacing/punctuation variant. */
function squashFacilityKey(key: string) {
  return key.replace(/[^A-Z0-9]/g, "");
}

function stripParenthetical(code: string) {
  return code.replace(/\(.*?\)/g, " ");
}

export function buildRoomLookup(
  rooms: { id: number; code: string }[],
  roomAliases: { alias: string; targetId: number }[],
) {
  const directRoomIdByKey = new Map<string, number>();
  const aliasRoomIdByKey = new Map<string, number>();
  const expandedRoomIdByKey = new Map<string, number>();
  // null marks a squashed key claimed by two different rooms (DB duplicates
  // like "BALH 1" vs "BALH1") — too ambiguous to auto-match.
  const squashedRoomIdByKey = new Map<string, number | null>();
  const duplicateRoomCodes = new Map<string, string[]>();

  const addSquashed = (key: string, id: number, code: string) => {
    const existing = squashedRoomIdByKey.get(key);
    if (existing === undefined) {
      squashedRoomIdByKey.set(key, id);
      duplicateRoomCodes.set(key, [code]);
    } else if (existing !== id) {
      squashedRoomIdByKey.set(key, null);
      const codes = duplicateRoomCodes.get(key);
      if (codes && !codes.includes(code)) codes.push(code);
    }
  };

  for (const room of rooms) {
    const key = normalizeFacilityKey(room.code);
    directRoomIdByKey.set(key, room.id);
    expandedRoomIdByKey.set(expandFacilityAbbreviations(key), room.id);
    addSquashed(squashFacilityKey(key), room.id, room.code);
    addSquashed(
      squashFacilityKey(expandFacilityAbbreviations(key)),
      room.id,
      room.code,
    );
  }
  for (const alias of roomAliases) {
    const key = normalizeFacilityKey(alias.alias);
    aliasRoomIdByKey.set(key, alias.targetId);
    if (!expandedRoomIdByKey.has(expandFacilityAbbreviations(key))) {
      expandedRoomIdByKey.set(expandFacilityAbbreviations(key), alias.targetId);
    }
    addSquashed(squashFacilityKey(key), alias.targetId, alias.alias);
  }
  const combinedRoomIdByKey = new Map([
    ...directRoomIdByKey,
    ...aliasRoomIdByKey,
  ]);
  for (const key of [...duplicateRoomCodes.keys()]) {
    if (squashedRoomIdByKey.get(key) !== null) duplicateRoomCodes.delete(key);
  }
  return {
    directRoomIdByKey,
    aliasRoomIdByKey,
    combinedRoomIdByKey,
    expandedRoomIdByKey,
    squashedRoomIdByKey,
    duplicateRoomCodes,
  };
}

export type RoomMatch = {
  roomId: number;
  kind: "direct" | "alias" | "fuzzy";
};

/** Tiered lookup: exact/alias → abbreviation-expanded → squashed (unambiguous only), each also tried with any "(...)" suffix removed. */
export function matchRoomId(
  lookup: ReturnType<typeof buildRoomLookup>,
  facility: string,
): RoomMatch | null {
  const candidates = [facility];
  const stripped = stripParenthetical(facility);
  if (stripped.trim() !== facility.trim()) candidates.push(stripped);
  // Registrar PDF column bleed: "CHEM 161B    PS A-232" — the venue is the
  // segment after the 2+-space run.
  const segments = facility.split(/\s{2,}/);
  if (segments.length > 1) candidates.push(segments[segments.length - 1]);
  // Slash combos ("ICROPS 134/AVR") fall back to the room before the slash —
  // only after the full string (real combo rooms like "FBS 155/FBS 051"
  // exist) misses every tier below.
  const slash = facility.split("/");
  const slashFallback = slash.length > 1 ? slash[0] : null;

  for (const candidate of candidates) {
    const key = normalizeFacilityKey(candidate);
    if (lookup.directRoomIdByKey.has(key)) {
      return { roomId: lookup.directRoomIdByKey.get(key)!, kind: "direct" };
    }
    if (lookup.aliasRoomIdByKey.has(key)) {
      return { roomId: lookup.aliasRoomIdByKey.get(key)!, kind: "alias" };
    }
  }
  for (const candidate of candidates) {
    const expanded = expandFacilityAbbreviations(
      normalizeFacilityKey(candidate),
    );
    const viaExpansion = lookup.expandedRoomIdByKey.get(expanded);
    if (viaExpansion != null) return { roomId: viaExpansion, kind: "fuzzy" };

    for (const squashKey of [
      squashFacilityKey(normalizeFacilityKey(candidate)),
      squashFacilityKey(expanded),
    ]) {
      const viaSquash = lookup.squashedRoomIdByKey.get(squashKey);
      if (viaSquash != null) return { roomId: viaSquash, kind: "fuzzy" };
    }
  }
  // AMIS truncates facility ids to 10 chars ("ASILH B-12" = ASILH B-125).
  // Accept only a unique squashed-prefix completion.
  if (facility.trim().length >= 9) {
    const truncated = squashFacilityKey(normalizeFacilityKey(facility));
    let completion: number | null | undefined;
    for (const [key, roomId] of lookup.squashedRoomIdByKey) {
      if (!key.startsWith(truncated)) continue;
      if (completion !== undefined) {
        completion = undefined; // second hit: ambiguous
        break;
      }
      completion = roomId;
    }
    if (completion != null) return { roomId: completion, kind: "fuzzy" };
  }
  if (slashFallback) {
    const viaSlash = matchRoomId(lookup, slashFallback);
    if (viaSlash) return { roomId: viaSlash.roomId, kind: "fuzzy" };
  }
  return null;
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
    fuzzyRoomMatch: 0,
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
      const match = matchRoomId(lookup, facility);
      roomId = match?.roomId ?? null;
      if (match == null) {
        stats.unmatchedFacility += 1;
        unmatched.set(facility, (unmatched.get(facility) ?? 0) + 1);
      } else if (match.kind === "direct") {
        stats.directRoomMatch += 1;
      } else if (match.kind === "alias") {
        stats.aliasRoomMatch += 1;
      } else {
        stats.fuzzyRoomMatch += 1;
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
    `  Room matches: ${input.stats.directRoomMatch} direct, ${input.stats.aliasRoomMatch} via alias, ${input.stats.fuzzyRoomMatch} fuzzy`,
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
