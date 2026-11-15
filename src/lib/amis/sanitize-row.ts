import type { AmisClassRow } from "./types";

/** Keys that must never be written to disk, git, or the DB import cache. */
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

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

const NAME_SUFFIX = /^(jr|sr|ii|iii|iv)$/i;

/** "Juan P. Dela Cruz" or "DELA CRUZ, JUAN P." to "JPDC". Blank and TBA give null. */
export function nameToInitials(name: string): string | null {
  const [head = "", ...rest] = name.split(",");
  const tail = rest.join(" ");
  const tokens = `${tail} ${head}`
    .split(/\s+/)
    .map((token) => token.replace(/[^\p{L}]/gu, ""))
    .filter((token) => token && !NAME_SUFFIX.test(token));
  if (tokens.length === 0 || /^t(ba|bd)$/i.test(tokens.join(""))) return null;
  return tokens.map((token) => token[0]?.toUpperCase()).join("");
}

function personName(person: unknown): string | null {
  if (typeof person === "string") return person;
  const record = asRecord(person);
  const user = asRecord(record?.user) ?? record;
  if (!user) return null;
  if (typeof user.formatted_name === "string") return user.formatted_name;
  const parts = [user.first_name, user.middle_name, user.last_name].filter(
    (part): part is string => typeof part === "string",
  );
  return parts.length > 0 ? parts.join(" ") : null;
}

/** Initials of every instructor on a row, joined with ", " in AMIS order. */
function rowInitials(row: AmisClassRow): string | null {
  const dates = Array.isArray(row.class_dates) ? row.class_dates : [];
  const people = [
    row.faculty,
    row.instructor,
    ...(Array.isArray(row.instructors) ? row.instructors : []),
    ...dates.map((date) => asRecord(date)?.faculty),
  ];
  const seen = new Set<string>();
  const initials: string[] = [];
  for (const person of people) {
    const name = personName(person)?.trim().toUpperCase();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    const value = nameToInitials(name);
    if (value) initials.push(value);
  }
  return initials.length > 0 ? initials.join(", ") : null;
}

/** Replace instructor names on a raw AMIS class row with their initials before caching or import. */
export function sanitizeAmisRow(row: AmisClassRow): AmisClassRow {
  const kept =
    typeof row.instructor_initials === "string"
      ? row.instructor_initials
      : null;
  const initials = rowInitials(row) ?? kept;
  const out = stripPii(row) as AmisClassRow;
  const parent = asRecord(row.parent);
  if (parent) out.parent = sanitizeAmisRow(parent);
  if (initials) out.instructor_initials = initials;
  return out;
}

export function sanitizeAmisRows(rows: AmisClassRow[]): AmisClassRow[] {
  return rows.map(sanitizeAmisRow);
}

/** True when JSON still embeds instructor PII keys (unsafe to commit). */
export function amisExportContainsInstructorPii(payload: unknown): boolean {
  return objectContainsStripKey(payload, STRIP_KEYS);
}

function objectContainsStripKey(value: unknown, keys: Set<string>): boolean {
  if (Array.isArray(value)) {
    return value.some((entry) => objectContainsStripKey(entry, keys));
  }
  if (value !== null && typeof value === "object") {
    for (const [key, nested] of Object.entries(
      value as Record<string, unknown>,
    )) {
      if (keys.has(key)) return true;
      if (objectContainsStripKey(nested, keys)) return true;
    }
  }
  return false;
}
