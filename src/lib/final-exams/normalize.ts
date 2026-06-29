import { normalizeFacilityKey } from "@lib/amis/normalize-class";

export type FinalExamImportRow = {
  course_code?: unknown;
  section?: unknown;
  course_title?: unknown;
  room_code?: unknown;
  exam_date?: unknown;
  starts_at?: unknown;
  ends_at?: unknown;
};

export type FinalExamExportPayload = {
  term_id?: number;
  source?: string;
  exams?: FinalExamImportRow[];
};

export type NormalizedFinalExam = {
  courseCode: string;
  section: string | null;
  courseTitle: string | null;
  facilityCode: string | null;
  examDate: string;
  startsAt: string;
  endsAt: string;
};

const MANILA = "Asia/Manila";

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

/** Parse YYYY-MM-DD or common OUR date strings as a Manila calendar day. */
export function parseExamDate(value: unknown): string | null {
  const raw = asString(value);
  if (!raw) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const slash = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (slash) {
    const [, month, day, year] = slash;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString("en-CA", { timeZone: MANILA });
}

/** Parse HH:MM or h:mm AM/PM as 24h HH:MM:SS for Postgres `time`. */
export function parseExamTime(value: unknown): string | null {
  const raw = asString(value);
  if (!raw) return null;

  const compact = raw.replace(/\s+/g, "").toUpperCase();
  const twentyFour = compact.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (twentyFour) {
    const hour = Number(twentyFour[1]);
    const minute = Number(twentyFour[2]);
    const second = Number(twentyFour[3] ?? "0");
    if (
      hour >= 0 &&
      hour <= 23 &&
      minute >= 0 &&
      minute <= 59 &&
      second >= 0 &&
      second <= 59
    ) {
      return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}`;
    }
  }

  const ampm = raw.match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i);
  if (ampm) {
    let hour = Number(ampm[1]);
    const minute = Number(ampm[2]);
    const meridiem = ampm[3].toUpperCase();
    if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return null;
    if (meridiem === "AM") {
      if (hour === 12) hour = 0;
    } else if (hour !== 12) {
      hour += 12;
    }
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
  }

  return null;
}

export function normalizeCourseCode(value: unknown): string | null {
  const raw = asString(value);
  if (!raw) return null;
  return raw.toUpperCase().replace(/\s+/g, " ");
}

export function normalizeFinalExamRow(
  row: FinalExamImportRow,
): NormalizedFinalExam | null {
  const courseCode = normalizeCourseCode(row.course_code);
  const examDate = parseExamDate(row.exam_date);
  const startsAt = parseExamTime(row.starts_at);
  const endsAt = parseExamTime(row.ends_at);
  if (!courseCode || !examDate || !startsAt || !endsAt) return null;

  const section = asString(row.section);
  const courseTitle = asString(row.course_title);
  const facility = asString(row.room_code);

  return {
    courseCode,
    section,
    courseTitle,
    facilityCode: facility,
    examDate,
    startsAt,
    endsAt,
  };
}

export function extractFinalExamRows(payload: unknown): FinalExamImportRow[] {
  if (payload == null) return [];
  if (Array.isArray(payload)) {
    return payload.flatMap((entry) => extractFinalExamRows(entry));
  }
  if (typeof payload !== "object") return [];

  const obj = payload as FinalExamExportPayload;
  if (Array.isArray(obj.exams)) return obj.exams;
  if (Array.isArray((obj as { data?: FinalExamImportRow[] }).data)) {
    return (obj as { data: FinalExamImportRow[] }).data;
  }
  return [];
}

export function defaultFinalExamsExportPath(termId: number) {
  return `data/final-exams-${termId}.json`;
}

export { normalizeFacilityKey };
