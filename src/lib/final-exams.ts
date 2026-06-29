import type { FinalExamRow } from "@lib/types";

export const FINALS_SCOPE_NOTE =
  "Final exam times come from OUR/registrar releases, not AMIS class schedules. Regular lecture and lab timetables stay on the room panel above. If nothing appears here, OUR may not have published finals for this term yet.";

const COURSE_CODE_PATTERN = /^[A-Za-z]{2,8}\s*\d{1,4}[A-Za-z]?$/;

export function looksLikeCourseCode(input: string): boolean {
  const trimmed = input.trim();
  if (trimmed.length < 4) return false;
  return COURSE_CODE_PATTERN.test(trimmed.replace(/\s+/g, " "));
}

export type FinalExamQuery = {
  courseCode?: string;
  roomCode?: string;
  date?: string;
  termId?: number;
};

export async function fetchFinalExams(
  query: FinalExamQuery,
): Promise<FinalExamRow[]> {
  const params = new URLSearchParams();
  if (query.courseCode) params.set("course_code", query.courseCode);
  if (query.roomCode) params.set("room_code", query.roomCode);
  if (query.date) params.set("date", query.date);
  if (query.termId != null) params.set("term_id", String(query.termId));

  const response = await fetch(`/api/final-exams?${params.toString()}`);
  if (!response.ok) return [];
  const payload = (await response.json()) as
    FinalExamRow[] | { data?: FinalExamRow[] };
  if (Array.isArray(payload)) return payload;
  return Array.isArray(payload?.data) ? payload.data : [];
}

export function formatExamDate(examDate: string): string {
  const [year, month, day] = examDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toLocaleDateString("en-PH", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function formatExamTime(value: string): string {
  const match = value.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return value;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const date = new Date(Date.UTC(2000, 0, 1, hour, minute));
  return date.toLocaleTimeString("en-PH", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  });
}

export function formatExamTimeRange(startsAt: string, endsAt: string): string {
  return `${formatExamTime(startsAt)} – ${formatExamTime(endsAt)}`;
}
