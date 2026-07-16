import type { AmisClassRow, NormalizedAmisClass } from "./types";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}

/** True when an object looks like one AMIS class row (not a page envelope). */
function looksLikeClassRow(value: unknown): value is AmisClassRow {
  const row = asRecord(value);
  if (!row) return false;
  // Page envelopes use `data` / nested `classes`; class rows carry section/type.
  if (Array.isArray(row.data) || asRecord(row.classes)) return false;
  return (
    row.section != null ||
    row.course_code != null ||
    row.courseCode != null ||
    row.type != null
  );
}

function extractRawClassRows(payload: unknown): AmisClassRow[] {
  if (payload == null) return [];

  // Bare list of class rows (common when someone dumps AMIS `data` to a file).
  // Must not recurse into each row as if it were another envelope — that yields
  // zero rows and --scrub-exports would wipe the file to classes: [].
  if (Array.isArray(payload)) {
    if (payload.length === 0) return [];
    if (looksLikeClassRow(payload[0])) {
      return payload.filter(looksLikeClassRow);
    }
    return payload.flatMap((entry) => extractRawClassRows(entry));
  }

  const obj = asRecord(payload);
  if (!obj) return [];

  const data = obj.data;
  if (Array.isArray(data)) {
    return looksLikeClassRow(data[0])
      ? (data as AmisClassRow[])
      : data.flatMap((entry) => extractRawClassRows(entry));
  }

  const classes = asRecord(obj.classes);
  if (classes) {
    const classesData = classes.data;
    if (Array.isArray(classesData)) {
      return extractRawClassRows(classesData);
    }
  }
  if (Array.isArray(obj.classes)) {
    return extractRawClassRows(obj.classes);
  }

  // Single class row passed through (e.g. tests).
  if (looksLikeClassRow(obj)) return [obj];

  return [];
}

/**
 * AMIS lists child sections (LAB/RCT/CPT) but omits their parent LEC as its own
 * list row — the lecture only appears embedded in each child's `parent` field.
 * Surface those parents (deduped by id, skipping any already listed) so lectures
 * actually import. The embedded parent lacks course_code/course, so inherit them
 * from the child that carried it.
 */
function withEmbeddedParents(rows: AmisClassRow[]): AmisClassRow[] {
  const existingIds = new Set(rows.map((r) => r.id).filter((id) => id != null));
  const parents = new Map<unknown, AmisClassRow>();
  for (const row of rows) {
    const parent = asRecord(row.parent);
    if (!parent) continue;
    const pid = parent.id;
    if (pid == null || existingIds.has(pid) || parents.has(pid)) continue;
    parents.set(pid, {
      ...parent,
      course_code: parent.course_code ?? row.course_code,
      course: parent.course ?? row.course,
      parent: undefined,
    });
  }
  return parents.size > 0 ? [...rows, ...parents.values()] : rows;
}

/** Unwrap paginated / nested AMIS responses into flat class rows, including the
 *  parent lectures AMIS only embeds inside child sections. */
export function extractClassRows(payload: unknown): AmisClassRow[] {
  return withEmbeddedParents(extractRawClassRows(payload));
}

function normalizeTimeToken(value: unknown) {
  const raw = asString(value);
  if (!raw) return null;
  return raw.replace(/\s+/g, "");
}

function canonicalizeDays(dayStr: string): string {
  return dayStr.toUpperCase().replace(/TH/g, "Th");
}

function canonicalizeScheduleSlot(slot: string): string {
  const match = slot.match(/^([a-zA-Z]+)(.*)$/);
  if (match?.[1] != null) {
    return canonicalizeDays(match[1]) + (match[2] ?? "");
  }
  return slot;
}

function scheduleFromClassDates(row: AmisClassRow): string[] | null {
  if (!Array.isArray(row.class_dates)) return null;
  const slots = row.class_dates
    .map((entry) => {
      const dateRow = asRecord(entry);
      if (!dateRow) return null;
      const day = asString(dateRow.date);
      const start = normalizeTimeToken(dateRow.start_time);
      const end = normalizeTimeToken(dateRow.end_time);
      if (!day || !start || !end) return null;
      return `${canonicalizeDays(day)} ${start}-${end}`;
    })
    .filter((slot): slot is string => slot !== null);
  return slots.length > 0 ? slots : null;
}

/**
 * Fallback for terms (e.g. CRS 1231) where AMIS leaves `class_dates` empty and
 * carries the single meeting slot on the row itself as `date` + `start_time` /
 * `end_time`. Same output shape as {@link scheduleFromClassDates}.
 */
function scheduleFromRowFields(row: AmisClassRow): string[] | null {
  const day = asString(row.date);
  const start = normalizeTimeToken(row.start_time);
  const end = normalizeTimeToken(row.end_time);
  if (!day || !start || !end) return null;
  return [`${canonicalizeDays(day)} ${start}-${end}`];
}

function scheduleFromScheduleField(row: AmisClassRow): string[] | null {
  const schedule = row.schedule;
  if (Array.isArray(schedule)) {
    const slots = schedule
      .map(asString)
      .filter((slot): slot is string => slot !== null)
      .map(canonicalizeScheduleSlot);
    return slots.length > 0 ? slots : null;
  }
  if (typeof schedule === "string") {
    const slots = schedule
      .split(",")
      .map((slot) => slot.trim())
      .filter(Boolean)
      .map(canonicalizeScheduleSlot);
    return slots.length > 0 ? slots : null;
  }
  return null;
}

function resolveFacilityCode(row: AmisClassRow): string | null {
  const direct =
    asString(row.facility_id) ??
    asString(row.facility_code) ??
    asString(row.room_code);
  if (direct) return direct;

  const facility = asRecord(row.facility);
  const nested =
    asString(facility?.code) ??
    asString(facility?.facility_code) ??
    asString(facility?.name) ??
    asString(facility?.facility_name);
  if (nested) return nested;

  const parent = asRecord(row.parent);
  return asString(parent?.facility_id) ?? asString(parent?.facility_code);
}

export function normalizeFacilityKey(code: string) {
  return code
    .trim()
    .toUpperCase()
    .replace(/[-.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function resolveCourseTitle(row: AmisClassRow, courseCode: string): string {
  const course = asRecord(row.course);
  const base =
    asString(course?.title) ??
    asString(row.course_title) ??
    asString(row.title) ??
    courseCode;
  const activity = asString(row.activity);
  if (courseCode.includes("HK 12") && activity) {
    return `${base} (${activity})`;
  }
  return base;
}

export function normalizeAmisClass(
  row: AmisClassRow,
  termId: number,
): NormalizedAmisClass | null {
  const courseCode = asString(row.course_code) ?? asString(row.courseCode);
  const section = asString(row.section);
  if (!courseCode || !section) return null;

  const schedule =
    scheduleFromClassDates(row) ??
    scheduleFromScheduleField(row) ??
    scheduleFromRowFields(row) ??
    [];

  return {
    courseCode,
    section,
    type: asString(row.type),
    courseTitle: resolveCourseTitle(row, courseCode),
    schedule,
    termId: Number(row.term_id ?? row.termId ?? termId),
    facilityCode: resolveFacilityCode(row),
  };
}
