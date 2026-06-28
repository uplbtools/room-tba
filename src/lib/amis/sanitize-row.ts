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
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (STRIP_KEYS.has(key)) continue;
      out[key] = stripPii(nested);
    }
    return out;
  }
  return value;
}

/** Remove instructor / faculty PII from a raw AMIS class row before caching or import. */
export function sanitizeAmisRow(row: AmisClassRow): AmisClassRow {
  return stripPii(row) as AmisClassRow;
}

export function sanitizeAmisRows(rows: AmisClassRow[]): AmisClassRow[] {
  return rows.map(sanitizeAmisRow);
}

/** True when JSON still embeds instructor name fields (unsafe to commit). */
export function amisExportContainsInstructorPii(payload: unknown): boolean {
  const text = JSON.stringify(payload).toLowerCase();
  return (
    text.includes('"formatted_name"') ||
    text.includes('"first_name"') ||
    text.includes('"faculty":')
  );
}
