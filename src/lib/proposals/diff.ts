export const FIELD_LABELS: Record<string, string> = {
  buildingName: "Building name",
  directions: "Directions",
  buildingType: "Building type",
  lat: "Latitude",
  lon: "Longitude",
  buildingId: "Building",
  dormName: "Dorm name",
  shortName: "Short name",
  gender: "Gender",
  capacity: "Capacity",
  roomCode: "Room code",
  collegeName: "College name",
  collegeId: "Parent college",
  divisionName: "Division name",
  description: "Description",
  managingOffice: "Managing office",
  contactEmail: "Contact email",
  isUpManaged: "UP managed",
  title: "Title",
  category: "Category",
  startsAt: "Starts",
  endsAt: "Ends",
  sourceUrl: "Source URL",
  imageUrl: "Image",
  recurrence: "Recurrence",
  rooms: "Bundled rooms",
};

export type FieldDiff = {
  field: string;
  label: string;
  /** null = empty / not set (render as em dash) */
  before: string | null;
  after: string | null;
};

// Keys with their own review summaries (bundled rooms, event locations).
const SKIPPED_KEYS = new Set(["rooms", "locations"]);

function formatValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value.trim() === "" ? null : value;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) {
    const items = value.filter((item) => item !== null && item !== undefined);
    return items.length === 0 ? null : items.map(String).join(", ");
  }
  return JSON.stringify(value);
}

/**
 * Before/after rows for a proposal patch against the currently published
 * entity. `current` is null for create_* proposals (before renders as new).
 * Unchanged fields are omitted so reviewers only see real differences.
 */
export function buildFieldDiffs(
  current: Record<string, unknown> | null,
  patch: Record<string, unknown>,
): FieldDiff[] {
  const diffs: FieldDiff[] = [];
  for (const [field, proposed] of Object.entries(patch)) {
    if (SKIPPED_KEYS.has(field)) continue;
    const before = current ? formatValue(current[field]) : null;
    const after = formatValue(proposed);
    if (current && before === after) continue;
    diffs.push({
      field,
      label: FIELD_LABELS[field] ?? field,
      before,
      after,
    });
  }
  return diffs;
}
