/** Volunteer CSV for campus gate / entry-point coordinates (#249, parent #157). */

export const CAMPUS_GATE_COORDINATES_HEADERS = [
  "name",
  "short_name",
  "slug",
  "gate_type",
  "lat",
  "lon",
  "is_primary",
  "directions",
  "osm_link",
  "verified",
  "verification_method",
  "notes",
] as const;

export type CampusGateCoordinatesHeader =
  (typeof CAMPUS_GATE_COORDINATES_HEADERS)[number];

export type GateType = "vehicle" | "pedestrian" | "both";

export type CampusGateCoordinatesRow = Record<
  CampusGateCoordinatesHeader,
  string
>;

export type CampusGateCoordinatesParseResult = {
  headers: string[];
  rows: CampusGateCoordinatesRow[];
  skippedInstructionRows: number;
};

export type CampusGateRowValidation = {
  rowIndex: number;
  name: string;
  errors: string[];
};

/** Rough UPLB campus bounds for volunteer coordinate sanity checks. */
export const UPLB_CAMPUS_LAT_RANGE = { min: 14.15, max: 14.19 } as const;
export const UPLB_CAMPUS_LON_RANGE = { min: 121.23, max: 121.26 } as const;

const GATE_TYPES = new Set<GateType>(["vehicle", "pedestrian", "both"]);
const VERIFIED_VALUES = new Set(["yes", "no", "true", "false", ""]);
const PRIMARY_VALUES = new Set(["true", "false", "yes", "no", ""]);

function isInstructionRow(row: CampusGateCoordinatesRow): boolean {
  const name = row.name.trim();
  const hasOtherData = CAMPUS_GATE_COORDINATES_HEADERS.some((key) => {
    if (key === "name" || key === "notes") return false;
    return row[key].trim().length > 0;
  });
  return name.length === 0 && !hasOtherData && row.notes.trim().length > 0;
}

/** Minimal RFC-style CSV row parser (quoted fields, commas). */
export function parseCsvRow(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      continue;
    }
    if (char === ",") {
      fields.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  fields.push(current);
  return fields;
}

export function rowFromFields(fields: string[]): CampusGateCoordinatesRow {
  const row = {} as CampusGateCoordinatesRow;
  for (let i = 0; i < CAMPUS_GATE_COORDINATES_HEADERS.length; i++) {
    row[CAMPUS_GATE_COORDINATES_HEADERS[i]] = (fields[i] ?? "").trim();
  }
  return row;
}

export function parseCampusGateCoordinatesCsv(
  text: string,
): CampusGateCoordinatesParseResult {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    throw new Error("CSV is empty");
  }

  const headers = parseCsvRow(lines[0]).map((h) => h.trim());
  const rows: CampusGateCoordinatesRow[] = [];
  let skippedInstructionRows = 0;

  for (const line of lines.slice(1)) {
    const row = rowFromFields(parseCsvRow(line));
    if (isInstructionRow(row)) {
      skippedInstructionRows++;
      continue;
    }
    rows.push(row);
  }

  return { headers, rows, skippedInstructionRows };
}

export function assertCampusGateCoordinatesHeaders(headers: string[]): void {
  const expected = [...CAMPUS_GATE_COORDINATES_HEADERS];
  if (
    headers.length !== expected.length ||
    !expected.every((header, index) => headers[index] === header)
  ) {
    throw new Error(
      `Unexpected headers. Expected: ${expected.join(", ")}; got: ${headers.join(", ")}`,
    );
  }
}

function parseOptionalNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const num = Number(trimmed);
  return Number.isFinite(num) ? num : null;
}

export function validateCampusGateRow(
  row: CampusGateCoordinatesRow,
  options: { requireCoordinates?: boolean } = {},
): string[] {
  const errors: string[] = [];
  const requireCoordinates = options.requireCoordinates ?? false;

  if (!row.name.trim()) {
    errors.push("name is required");
  }

  const gateType = row.gate_type.trim().toLowerCase();
  if (gateType && !GATE_TYPES.has(gateType as GateType)) {
    errors.push("gate_type must be vehicle, pedestrian, or both");
  }

  const primary = row.is_primary.trim().toLowerCase();
  if (primary && !PRIMARY_VALUES.has(primary)) {
    errors.push("is_primary must be true or false");
  }

  const verified = row.verified.trim().toLowerCase();
  if (verified && !VERIFIED_VALUES.has(verified)) {
    errors.push("verified must be yes or no");
  }

  const lat = parseOptionalNumber(row.lat);
  const lon = parseOptionalNumber(row.lon);

  if (requireCoordinates) {
    if (lat === null || lon === null) {
      errors.push("lat and lon are required for submission");
    }
  }

  if (lat !== null) {
    if (lat < UPLB_CAMPUS_LAT_RANGE.min || lat > UPLB_CAMPUS_LAT_RANGE.max) {
      errors.push(
        `lat ${lat} is outside UPLB campus range (${UPLB_CAMPUS_LAT_RANGE.min}–${UPLB_CAMPUS_LAT_RANGE.max})`,
      );
    }
  }

  if (lon !== null) {
    if (lon < UPLB_CAMPUS_LON_RANGE.min || lon > UPLB_CAMPUS_LON_RANGE.max) {
      errors.push(
        `lon ${lon} is outside UPLB campus range (${UPLB_CAMPUS_LON_RANGE.min}–${UPLB_CAMPUS_LON_RANGE.max})`,
      );
    }
  }

  if ((lat === null) !== (lon === null)) {
    errors.push("lat and lon must both be filled or both left empty");
  }

  if (requireCoordinates && verified !== "yes" && verified !== "true") {
    errors.push("verified must be yes before submission");
  }

  if (requireCoordinates && !row.verification_method.trim()) {
    errors.push("verification_method is required for submission");
  }

  return errors;
}

export function validateCampusGateCoordinatesCsv(
  text: string,
  options: { requireCoordinates?: boolean } = {},
): CampusGateRowValidation[] {
  const parsed = parseCampusGateCoordinatesCsv(text);
  assertCampusGateCoordinatesHeaders(parsed.headers);

  return parsed.rows
    .map((row, index) => {
      const errors = validateCampusGateRow(row, options);
      return {
        rowIndex: index + 2,
        name: row.name,
        errors,
      };
    })
    .filter((result) => result.errors.length > 0);
}
