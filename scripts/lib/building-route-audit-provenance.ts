import { createHash } from "node:crypto";

export type BuildingRouteProvenanceRow = {
  id: number;
  buildingName: string;
  lat: number | null;
  lon: number | null;
};

export function sha256Text(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/**
 * Stable logical fingerprint for the building rows consumed by routing audits.
 *
 * API row order is not meaningful, so rows are normalized and sorted by stable
 * numeric id before hashing. Names are trimmed only for surrounding whitespace;
 * coordinates remain exact parsed numbers/null so any route-relevant pin change
 * invalidates the fingerprint.
 */
export function buildingRouteSourceSha256(
  rows: BuildingRouteProvenanceRow[],
): string {
  const canonical = rows
    .map((row) => ({
      id: row.id,
      buildingName: row.buildingName.trim(),
      lat: row.lat,
      lon: row.lon,
    }))
    .sort(
      (a, b) =>
        a.id - b.id || a.buildingName.localeCompare(b.buildingName),
    );
  return sha256Text(JSON.stringify(canonical));
}
