/**
 * Registrar-agnostic class import shape (docs/fork-data-guide.md). A fork
 * exports its registrar data to this flat CSV/JSON layout and runs
 * `bun run import:classes-generic` — no campus-specific adapter needed.
 *
 * One row = one meeting slot of one section. Rows sharing
 * term_id + course_code + section + type merge into one class whose
 * `schedule` holds every slot.
 *
 * Emitted slots ("MWF 9:00AM-10:00AM") must stay parseable by
 * `parseScheduleTime` in schedule-renderer.ts — the app-wide contract.
 */

import { parseCsvRow } from "./campus-gate-coordinates-template";

export const GENERIC_CLASS_REQUIRED_HEADERS = [
  "course_code",
  "section",
  "type",
  "days",
  "start",
  "end",
  "room_code",
  "term_id",
] as const;

export const GENERIC_CLASS_OPTIONAL_HEADERS = [
  "building_code",
  "course_title",
  // Registrar college / department codes (#846), e.g. "CAS" / "LBICS". Blank
  // or missing = leave any existing DB value untouched.
  "acad_group",
  "acad_org",
] as const;

export const GENERIC_CLASS_HEADERS = [
  ...GENERIC_CLASS_REQUIRED_HEADERS,
  ...GENERIC_CLASS_OPTIONAL_HEADERS,
] as const;

export type GenericClassHeader = (typeof GENERIC_CLASS_HEADERS)[number];

export type GenericClassRow = Record<GenericClassHeader, string>;

/** `row` is the CSV line number (header = line 1) or the JSON array index + 1. */
export type GenericClassEntry = { row: number; values: GenericClassRow };

export type RowIssue = { row: number; field: string; message: string };

export type NormalizedGenericClass = {
  courseCode: string;
  section: string;
  type: "LEC" | "LAB";
  courseTitle: string | null;
  schedule: string[];
  termId: number;
  /** Free-text room names to try against rooms + aliases, in order. */
  roomCandidates: string[];
  /** Optional college / department codes; undefined = column not provided. */
  acadGroup?: string;
  acadOrg?: string;
};

const CLASS_TYPE_MAP: Record<string, "LEC" | "LAB"> = {
  LEC: "LEC",
  LECTURE: "LEC",
  LAB: "LAB",
  LABORATORY: "LAB",
};

/**
 * Tokenize a days string into schedule-renderer day tokens (M T W Th F S).
 * "TTh" → ["T","Th"]; Sundays and anything else return null.
 */
export function parseDayTokens(days: string): string[] | null {
  const src = days.trim();
  if (!src) return null;
  const tokens: string[] = [];
  for (let i = 0; i < src.length; i++) {
    if (src.slice(i, i + 2).toUpperCase() === "TH") {
      tokens.push("Th");
      i++;
      continue;
    }
    const one = src[i].toUpperCase();
    if (["M", "T", "W", "F", "S"].includes(one)) {
      tokens.push(one);
      continue;
    }
    return null;
  }
  return tokens;
}

/**
 * Accept "8:00AM", "1:30 pm", or 24-hour "13:30"; emit the 12-hour label the
 * schedule renderer expects, plus minutes since midnight for ordering checks.
 */
export function normalizeClassTime(
  value: string,
): { label: string; minutes: number } | null {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  if (minute > 59) return null;
  const period = match[3]?.toUpperCase();
  if (period) {
    if (hour < 1 || hour > 12) return null;
    if (period === "PM" && hour !== 12) hour += 12;
    if (period === "AM" && hour === 12) hour = 0;
  } else if (hour > 23) {
    return null;
  }
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const label = `${h12}:${String(minute).padStart(2, "0")}${hour < 12 ? "AM" : "PM"}`;
  return { label, minutes: hour * 60 + minute };
}

function emptyRow(): GenericClassRow {
  const row = {} as GenericClassRow;
  for (const header of GENERIC_CLASS_HEADERS) row[header] = "";
  return row;
}

/**
 * Parse the CSV variant. Headers are matched by name (any column order);
 * unknown extra columns are ignored. Throws on missing required headers —
 * that is a file-shape problem, not a row problem.
 */
export function parseGenericClassesCsv(text: string): GenericClassEntry[] {
  // Strip a UTF-8 byte-order mark before splitting.
  const lines = text.replace(/^﻿/, "").split(/\r?\n/);
  let headerLine = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().length > 0) {
      headerLine = i;
      break;
    }
  }
  if (headerLine === -1) throw new Error("CSV is empty");

  const headers = parseCsvRow(lines[headerLine]).map((h) =>
    h.trim().toLowerCase(),
  );
  const missing = GENERIC_CLASS_REQUIRED_HEADERS.filter(
    (h) => !headers.includes(h),
  );
  if (missing.length > 0) {
    throw new Error(
      `CSV is missing required column(s): ${missing.join(", ")}. Expected headers: ${GENERIC_CLASS_HEADERS.join(", ")}`,
    );
  }

  const entries: GenericClassEntry[] = [];
  for (let i = headerLine + 1; i < lines.length; i++) {
    if (lines[i].trim().length === 0) continue;
    const fields = parseCsvRow(lines[i]);
    const values = emptyRow();
    for (let col = 0; col < headers.length; col++) {
      const header = headers[col] as GenericClassHeader;
      if ((GENERIC_CLASS_HEADERS as readonly string[]).includes(header)) {
        values[header] = (fields[col] ?? "").trim();
      }
    }
    entries.push({ row: i + 1, values });
  }
  return entries;
}

/** Parse the JSON variant: an array of flat objects with the same keys. */
export function parseGenericClassesJson(text: string): GenericClassEntry[] {
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch (error) {
    throw new Error(`Invalid JSON: ${(error as Error).message}`);
  }
  if (!Array.isArray(payload)) {
    throw new Error(
      "JSON must be an array of row objects (course_code, section, type, days, start, end, room_code, term_id, …)",
    );
  }
  return payload.map((item, index) => {
    if (item === null || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(`JSON entry ${index + 1} is not an object`);
    }
    const record = item as Record<string, unknown>;
    const values = emptyRow();
    for (const header of GENERIC_CLASS_HEADERS) {
      const raw = record[header];
      if (raw == null) continue;
      values[header] = String(raw).trim();
    }
    return { row: index + 1, values };
  });
}

export function parseGenericClassesFile(
  text: string,
  kind: "csv" | "json",
): GenericClassEntry[] {
  return kind === "json"
    ? parseGenericClassesJson(text)
    : parseGenericClassesCsv(text);
}

/** Field-level validation. Every issue names the row number and field. */
export function validateGenericClassEntries(
  entries: GenericClassEntry[],
): RowIssue[] {
  const issues: RowIssue[] = [];
  for (const { row, values } of entries) {
    if (!values.course_code) {
      issues.push({ row, field: "course_code", message: "is required" });
    }
    if (!values.section) {
      issues.push({ row, field: "section", message: "is required" });
    }
    if (!CLASS_TYPE_MAP[values.type.toUpperCase()]) {
      issues.push({
        row,
        field: "type",
        message: `must be LEC or LAB (got "${values.type}")`,
      });
    }
    if (!parseDayTokens(values.days)) {
      issues.push({
        row,
        field: "days",
        message: `must combine M, T, W, Th, F, S (got "${values.days}")`,
      });
    }
    const start = normalizeClassTime(values.start);
    const end = normalizeClassTime(values.end);
    if (!start) {
      issues.push({
        row,
        field: "start",
        message: `must be a time like "8:00AM" or "13:30" (got "${values.start}")`,
      });
    }
    if (!end) {
      issues.push({
        row,
        field: "end",
        message: `must be a time like "9:00AM" or "14:30" (got "${values.end}")`,
      });
    }
    if (start && end && end.minutes <= start.minutes) {
      issues.push({
        row,
        field: "end",
        message: `must be after start (${values.start}-${values.end})`,
      });
    }
    const termId = Number(values.term_id);
    if (!Number.isInteger(termId) || termId <= 0) {
      issues.push({
        row,
        field: "term_id",
        message: `must be a positive integer (got "${values.term_id}")`,
      });
    }
  }
  return issues;
}

export function formatRowIssues(issues: RowIssue[]): string {
  return issues
    .map((issue) => `  row ${issue.row}: ${issue.field} ${issue.message}`)
    .join("\n");
}

function naturalKey(values: GenericClassRow): string {
  return [
    values.term_id,
    values.course_code.toUpperCase(),
    values.section.toUpperCase(),
    CLASS_TYPE_MAP[values.type.toUpperCase()],
  ].join("|");
}

/**
 * Turn validated entries into class rows, merging repeated
 * term+course+section+type rows into one class with multiple schedule slots.
 */
export function normalizeGenericClasses(
  entries: GenericClassEntry[],
): NormalizedGenericClass[] {
  const byKey = new Map<string, NormalizedGenericClass>();
  for (const { values } of entries) {
    const days = parseDayTokens(values.days);
    const start = normalizeClassTime(values.start);
    const end = normalizeClassTime(values.end);
    if (!days || !start || !end) {
      throw new Error(
        "normalizeGenericClasses() called on unvalidated entries — run validateGenericClassEntries() first",
      );
    }
    const slot = `${days.join("")} ${start.label}-${end.label}`;
    const candidates: string[] = [];
    if (values.room_code) {
      candidates.push(values.room_code);
      if (values.building_code) {
        candidates.push(`${values.building_code} ${values.room_code}`);
      }
    }

    const key = naturalKey(values);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, {
        courseCode: values.course_code,
        section: values.section,
        type: CLASS_TYPE_MAP[values.type.toUpperCase()],
        courseTitle: values.course_title || null,
        schedule: [slot],
        termId: Number(values.term_id),
        roomCandidates: candidates,
        acadGroup: values.acad_group || undefined,
        acadOrg: values.acad_org || undefined,
      });
      continue;
    }
    if (!existing.schedule.includes(slot)) existing.schedule.push(slot);
    for (const candidate of candidates) {
      if (!existing.roomCandidates.includes(candidate)) {
        existing.roomCandidates.push(candidate);
      }
    }
    if (!existing.courseTitle && values.course_title) {
      existing.courseTitle = values.course_title;
    }
    if (!existing.acadGroup && values.acad_group) {
      existing.acadGroup = values.acad_group;
    }
    if (!existing.acadOrg && values.acad_org) {
      existing.acadOrg = values.acad_org;
    }
  }
  return [...byKey.values()];
}
