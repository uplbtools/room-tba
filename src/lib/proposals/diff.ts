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
  crFacilities: "CR facilities",
  recurrence: "Recurrence",
  rooms: "Bundled rooms",
  locations: "Locations",
  routeId: "Jeepney route",
  isActive: "Listed",
};

export type FieldDiff = {
  field: string;
  label: string;
  /** null = empty / not set (render as em dash) */
  before: string | null;
  after: string | null;
};

// Keys with their own review summary (create_building bundled rooms).
const SKIPPED_KEYS = new Set(["rooms"]);

/** One-line summary per event location so reviewers see what changes. */
function formatLocations(value: unknown): string | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  return value
    .map((item) => {
      const loc = item as {
        label?: unknown;
        lat?: unknown;
        lon?: unknown;
      };
      const name =
        typeof loc.label === "string" && loc.label.trim()
          ? loc.label.trim()
          : "Unnamed";
      return typeof loc.lat === "number" && typeof loc.lon === "number"
        ? `${name} (${loc.lat.toFixed(5)}, ${loc.lon.toFixed(5)})`
        : name;
    })
    .join("; ");
}

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
    const format = field === "locations" ? formatLocations : formatValue;
    const before = current ? format(current[field]) : null;
    const after = format(proposed);
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
