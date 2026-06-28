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

/** Unwrap paginated / nested AMIS responses into flat class rows. */
export function extractClassRows(payload: unknown): AmisClassRow[] {
  if (payload == null) return [];
  if (Array.isArray(payload)) {
    return payload.flatMap((entry) => extractClassRows(entry));
  }

  const obj = asRecord(payload);
  if (!obj) return [];

  if (Array.isArray(obj.data)) return obj.data as AmisClassRow[];

  const classes = asRecord(obj.classes);
  if (classes && Array.isArray(classes.data)) {
    return classes.data as AmisClassRow[];
  }
  if (Array.isArray(obj.classes)) return obj.classes as AmisClassRow[];

  return [];
}

function normalizeTimeToken(value: unknown) {
  const raw = asString(value);
  if (!raw) return null;
  return raw.replace(/\s+/g, "");
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
      return `${day} ${start}-${end}`;
    })
    .filter((slot): slot is string => slot !== null);
  return slots.length > 0 ? slots : null;
}

function scheduleFromScheduleField(row: AmisClassRow): string[] | null {
  const schedule = row.schedule;
  if (Array.isArray(schedule)) {
    const slots = schedule.map(asString).filter((slot): slot is string => slot !== null);
    return slots.length > 0 ? slots : null;
  }
  if (typeof schedule === "string") {
    const slots = schedule
      .split(",")
      .map((slot) => slot.trim())
      .filter(Boolean);
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
  return code.trim().toUpperCase().replace(/-/g, " ").replace(/\s+/g, " ");
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
