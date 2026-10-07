import { parseScheduleTime } from "@lib/schedule-renderer";

/** "4" / "11:30" plus its period, from minutes since midnight. */
function clock(minutes: number): { text: string; period: "AM" | "PM" } {
  const hour24 = Math.floor(minutes / 60) % 24;
  const minute = minutes % 60;
  const hour = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return {
    text: minute ? `${hour}:${String(minute).padStart(2, "0")}` : `${hour}`,
    period: hour24 >= 12 ? "PM" : "AM",
  };
}

/** "4–5 PM", "11:30 AM–1 PM": the period once when both ends share it. */
export function formatMinutesRange(startMin: number, endMin: number): string {
  const a = clock(startMin);
  const b = clock(endMin);
  return a.period === b.period
    ? `${a.text}–${b.text} ${b.period}`
    : `${a.text} ${a.period}–${b.text} ${b.period}`;
}

/** "WF 04:00PM-05:00PM" -> "WF 4–5 PM"; TBA and unparsed strings pass through. */
export function formatScheduleShort(schedule: string): string {
  const parsed = parseScheduleTime(schedule.trim());
  if (!parsed) return schedule;
  const days = (parsed.days ?? "").replace(/TH/gi, "Th").replace(/SA/gi, "Sa");
  return `${days} ${formatMinutesRange(parsed.startMinutes, parsed.endMinutes)}`;
}

/** "LEC" -> "Lec", "RCT" -> "Recit"; AMIS sends component types in caps. */
export function formatSectionType(type: string | null | undefined): string {
  const t = (type ?? "").trim();
  if (!t) return "Class";
  if (/^RCT$/i.test(t)) return "Recit";
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}
