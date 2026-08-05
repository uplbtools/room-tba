/** Above this, treat the fix as approximate for UI copy / toast. */
export const POOR_GPS_ACCURACY_M = 75;

export function describeLocationFix(
  accuracyMeters: number | null | undefined,
): {
  level: "good" | "approximate";
  message: string;
} {
  if (
    accuracyMeters == null ||
    !Number.isFinite(accuracyMeters) ||
    accuracyMeters <= POOR_GPS_ACCURACY_M
  ) {
    return { level: "good", message: "Location found!" };
  }
  const rounded = Math.max(1, Math.round(accuracyMeters));
  return {
    level: "approximate",
    message: `GPS is approximate (±${rounded} m). Walk outdoors and wait for a better fix.`,
  };
}

/** Rough geodesic circle as a GeoJSON polygon ([lng, lat] center). */
export function metersToLngLatCircle(
  center: [number, number],
  radiusMeters: number,
  steps = 64,
): GeoJSON.Polygon {
  const [lng, lat] = center;
  if (!(radiusMeters > 0) || !Number.isFinite(radiusMeters)) {
    return {
      type: "Polygon",
      coordinates: [
        [
          [lng, lat],
          [lng, lat],
          [lng, lat],
          [lng, lat],
        ],
      ],
    };
  }

  const earth = 6_371_000;
  const latRad = (lat * Math.PI) / 180;
  const lngRad = (lng * Math.PI) / 180;
  const angDist = radiusMeters / earth;
  const ring: [number, number][] = [];

  for (let i = 0; i <= steps; i++) {
    const bearing = (i / steps) * 2 * Math.PI;
    const lat2 = Math.asin(
      Math.sin(latRad) * Math.cos(angDist) +
        Math.cos(latRad) * Math.sin(angDist) * Math.cos(bearing),
    );
    const lng2 =
      lngRad +
      Math.atan2(
        Math.sin(bearing) * Math.sin(angDist) * Math.cos(latRad),
        Math.cos(angDist) - Math.sin(latRad) * Math.sin(lat2),
      );
    ring.push([(lng2 * 180) / Math.PI, (lat2 * 180) / Math.PI]);
  }

  return { type: "Polygon", coordinates: [ring] };
}
