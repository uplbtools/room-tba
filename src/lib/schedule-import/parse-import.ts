import { extractClassRows } from "@lib/amis/normalize-class";
import type { ImportedScheduleRow, ParseImportResult } from "./types";

const STRIP_KEYS = new Set([
  "faculty",
  "instructors",
  "instructor",
  "faculty_in_charge",
  "user",
  "first_name",
  "middle_name",
  "last_name",
  "formatted_name",
  "full_name",
  "name_suffix",
  "suffix",
  "email",
  "contact_email",
  "phone",
  "mobile",
]);

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

function normalizeCourseCode(value: unknown): string | null {
  const raw = asString(value);
  return raw ? raw.replace(/\s+/g, " ").toUpperCase() : null;
}

function normalizeSection(value: unknown): string | null {
  const raw = asString(value);
  return raw ? raw.trim().toUpperCase() : null;
}

function normalizeType(value: unknown): string | null {
  const raw = asString(value);
  return raw ? raw.trim().toUpperCase() : null;
}

function scheduleFromField(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map(asString)
      .filter((slot): slot is string => slot !== null && slot !== "TBA");
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed || trimmed === "TBA") return [];
    return trimmed
      .split(/[|;]/)
      .map((slot) => slot.trim())
      .filter(Boolean);
  }
  return [];
}

function rowFromRecord(
  record: Record<string, unknown>,
): ImportedScheduleRow | null {
  const courseCode =
    normalizeCourseCode(record.course_code) ??
    normalizeCourseCode(record.courseCode) ??
    normalizeCourseCode(record.course);
  const section =
    normalizeSection(record.section) ?? normalizeSection(record.sec);
  const type =
    normalizeType(record.type) ??
    normalizeType(record.class_type) ??
    normalizeType(record.classType);

  if (!courseCode || !section || !type) return null;

  let schedule = scheduleFromField(record.schedule);
  if (schedule.length === 0 && Array.isArray(record.class_dates)) {
    schedule = record.class_dates
      .map((entry) => {
        if (!entry || typeof entry !== "object") return null;
        const row = entry as Record<string, unknown>;
        const day = asString(row.date);
        const start = asString(row.start_time)?.replace(/\s+/g, "");
        const end = asString(row.end_time)?.replace(/\s+/g, "");
        if (!day || !start || !end) return null;
        return `${day} ${start}-${end}`;
      })
      .filter((slot): slot is string => slot !== null);
  }

  return {
    courseCode,
    section,
    type,
    schedule,
  };
}

function stripPii(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stripPii);
  }
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(
      value as Record<string, unknown>,
    )) {
      if (STRIP_KEYS.has(key)) continue;
      out[key] = stripPii(nested);
    }
    return out;
  }
  return value;
}

function rowsFromJsonPayload(payload: unknown): ImportedScheduleRow[] {
  const rawRows = extractClassRows(payload);
  const normalized: ImportedScheduleRow[] = [];

  for (const row of rawRows) {
    const record = row as Record<string, unknown>;
    const parsed = rowFromRecord(record);
    if (parsed) normalized.push(parsed);
  }

  if (normalized.length === 0 && Array.isArray(payload)) {
    for (const entry of payload) {
      if (!entry || typeof entry !== "object") continue;
      const parsed = rowFromRecord(entry as Record<string, unknown>);
      if (parsed) normalized.push(parsed);
    }
  }

  return normalized;
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current.trim());
  return cells;
}

function headerIndex(headers: string[], names: string[]): number {
  const normalized = headers.map((h) =>
    h.trim().toLowerCase().replace(/\s+/g, "_"),
  );
  for (const name of names) {
    const idx = normalized.indexOf(name);
    if (idx >= 0) return idx;
  }
  return -1;
}

function rowsFromCsv(text: string): ImportedScheduleRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]);
  const courseIdx = headerIndex(headers, ["course_code", "course", "code"]);
  const sectionIdx = headerIndex(headers, ["section", "sec"]);
  const typeIdx = headerIndex(headers, ["type", "class_type"]);
  const scheduleIdx = headerIndex(headers, ["schedule", "schedules", "time"]);

  if (courseIdx < 0 || sectionIdx < 0 || typeIdx < 0) return [];

  const rows: ImportedScheduleRow[] = [];
  for (const line of lines.slice(1)) {
    const cells = parseCsvLine(line);
    const record: Record<string, unknown> = {
      course_code: cells[courseIdx],
      section: cells[sectionIdx],
      type: cells[typeIdx],
    };
    if (scheduleIdx >= 0) {
      record.schedule = cells[scheduleIdx];
    }
    const parsed = rowFromRecord(record);
    if (parsed) rows.push(parsed);
  }
  return rows;
}

/** Parse AMIS Schedule Extractor JSON or CSV export into normalized rows. */
export function parseScheduleImport(text: string): ParseImportResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return { ok: false, error: "Paste a schedule export to import." };
  }

  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      const payload = stripPii(JSON.parse(trimmed)) as unknown;
      const rows = rowsFromJsonPayload(payload);
      if (rows.length === 0) {
        return {
          ok: false,
          error:
            "No course rows found in JSON. Check course_code, section, and type fields.",
        };
      }
      return { ok: true, rows };
    } catch {
      return { ok: false, error: "Invalid JSON. Check the export format." };
    }
  }

  const csvRows = rowsFromCsv(trimmed);
  if (csvRows.length === 0) {
    return {
      ok: false,
      error:
        "Unrecognized format. Paste JSON from AMIS Schedule Extractor or CSV with course_code, section, type, and schedule columns.",
    };
  }
  return { ok: true, rows: csvRows };
}

export function matchKey(
  courseCode: string,
  section: string,
  type: string,
): string {
  return `${courseCode.trim().toUpperCase()}::${section.trim().toUpperCase()}::${type.trim().toUpperCase()}`;
}
