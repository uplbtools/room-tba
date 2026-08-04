/**
 * Coordinate extraction for the approver map preview (#873 follow-up).
 *
 * A proposal's coordinates live in `proposedPatch` keyed by the target table's
 * column names (`lat` / `lon`), with the published values mirrored in
 * `currentValues`. Events carry theirs in a `locations` array instead.
 */

export type PinPoint = { lat: number; lon: number };

export type ProposalPinChange = {
  /** Published position, or null for create_* proposals and new locations. */
  before: PinPoint | null;
  /** Proposed position. */
  after: PinPoint;
};

function toFinite(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

/** A point is only usable if both halves parse — a lone lat is not a location. */
function readPoint(source: Record<string, unknown> | null | undefined) {
  if (!source) return null;
  const lat = toFinite(source.lat);
  const lon = toFinite(source.lon);
  return lat === null || lon === null ? null : { lat, lon };
}

/** First location of an event patch, which stores `locations: [{lat, lon}]`. */
function readEventPoint(patch: Record<string, unknown>) {
  const locations = patch.locations;
  if (!Array.isArray(locations) || locations.length === 0) return null;
  const first = locations[0];
  return typeof first === "object" && first !== null
    ? readPoint(first as Record<string, unknown>)
    : null;
}

/**
 * The pin change a proposal represents, or null when it does not move a pin.
 * Returning null is the signal to render no map preview at all.
 */
export function proposalPinChange(proposal: {
  proposedPatch: Record<string, unknown>;
  currentValues?: Record<string, unknown> | null;
}): ProposalPinChange | null {
  const patch = proposal.proposedPatch ?? {};
  const after = readPoint(patch) ?? readEventPoint(patch);
  if (!after) return null;

  const before = readPoint(proposal.currentValues);
  // An unchanged pin is not a change worth previewing.
  if (before && before.lat === after.lat && before.lon === after.lon) {
    return null;
  }
  return { before, after };
}

/**
 * Bounds enclosing both pins, padded so fitBounds does not zoom to maximum on
 * a near-zero span. Returns null when there is only one point to show.
 */
export function pinChangeBounds(
  change: ProposalPinChange,
  padDegrees = 0.0008,
): [[number, number], [number, number]] | null {
  if (!change.before) return null;
  const lats = [change.before.lat, change.after.lat];
  const lons = [change.before.lon, change.after.lon];
  return [
    [Math.min(...lons) - padDegrees, Math.min(...lats) - padDegrees],
    [Math.max(...lons) + padDegrees, Math.max(...lats) + padDegrees],
  ];
}

/** Metres between the published and proposed pins, for the "moved by" hint. */
export function pinMoveDistanceMeters(
  change: ProposalPinChange,
): number | null {
  if (!change.before) return null;
  const R = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(change.after.lat - change.before.lat);
  const dLon = toRad(change.after.lon - change.before.lon);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(change.before.lat)) *
      Math.cos(toRad(change.after.lat)) *
      Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}
