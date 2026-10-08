/** Above this, treat the fix as approximate for UI copy / toast. */
export const POOR_GPS_ACCURACY_M = 75;

/**
 * What to tell the user about a fix. A good fix says nothing: the blue dot
 * appearing is the confirmation, like Google Maps (a "Location found!" toast
 * used to cover the map controls on every locate).
 */
export function describeLocationFix(
  accuracyMeters: number | null | undefined,
): {
  level: "good" | "approximate";
  message: string | null;
} {
  if (
    accuracyMeters == null ||
    !Number.isFinite(accuracyMeters) ||
    accuracyMeters <= POOR_GPS_ACCURACY_M
  ) {
    return { level: "good", message: null };
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

/** Shown, with a retry, when the browser refuses location for this site. */
export const LOCATION_DENIED_MESSAGE =
  "Location is off for this site. Allow it in browser settings.";

/** The fields of a DeviceOrientationEvent the compass heading needs. */
export type OrientationReading = {
  alpha: number | null;
  absolute: boolean;
  /** iOS Safari: degrees clockwise from magnetic north. */
  webkitCompassHeading?: number;
};

/**
 * Compass heading in degrees clockwise from north (0 to 360), or null when
 * the reading is not anchored to north. iOS reports `webkitCompassHeading`;
 * elsewhere only an absolute event's alpha (counter-clockwise) is a compass.
 * `screenAngle` corrects for a phone held in landscape.
 */
export function compassHeading(
  reading: OrientationReading,
  screenAngle = 0,
): number | null {
  let heading: number | null = null;
  if (
    typeof reading.webkitCompassHeading === "number" &&
    Number.isFinite(reading.webkitCompassHeading)
  ) {
    heading = reading.webkitCompassHeading;
  } else if (reading.absolute && typeof reading.alpha === "number") {
    heading = 360 - reading.alpha;
  }
  if (heading === null || !Number.isFinite(heading)) return null;
  return (((heading + screenAngle) % 360) + 360) % 360;
}
