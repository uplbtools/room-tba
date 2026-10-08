/**
 * Ride legs drawn along the road (#966 follow-up): cut the stretch between
 * the board and alight stops out of a route's stored road geometry
 * (src/constants/jeepney-geometries.json), so a jeep leg follows the street
 * instead of a straight chord from stop to stop across the blocks.
 */

import { distanceMeters } from "../campus-route";

type LngLat = [number, number];
type LatLon = { lat: number; lon: number };

/** A stop farther than this from the line is not on it; keep the chord. */
export const RIDE_SNAP_TOLERANCE_METERS = 80;

/** Closest point on segment ab to p, in local metres, plus where along it. */
function projectOnSegment(
  p: LatLon,
  a: LngLat,
  b: LngLat,
): { meters: number; t: number; point: LngLat } {
  const cos = Math.cos((p.lat * Math.PI) / 180);
  const ax = a[0] * cos;
  const ay = a[1];
  const dx = b[0] * cos - ax;
  const dy = b[1] - ay;
  const px = p.lon * cos;
  const py = p.lat;
  const len2 = dx * dx + dy * dy;
  const t =
    len2 === 0
      ? 0
      : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  const point: LngLat = [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
  return {
    meters: distanceMeters(p, { lat: point[1], lon: point[0] }),
    t,
    point,
  };
}

type Projection = { segment: number; t: number; point: LngLat; meters: number };

/**
 * First segment (from `start`) where `p` touches the line within tolerance,
 * refined to the local minimum there. Taking the *first* touch, not the global
 * best, keeps an out-and-back or loop line from jumping to its return pass.
 */
function firstTouch(
  line: LngLat[],
  p: LatLon,
  start: number,
  minT: number,
): Projection | null {
  let best: Projection | null = null;
  for (let i = start; i < line.length - 1; i++) {
    const hit = projectOnSegment(p, line[i]!, line[i + 1]!);
    // On the board stop's own segment the alight point must lie further on.
    if (i === start && hit.t < minT) continue;
    if (best && hit.meters > best.meters) {
      if (best.meters <= RIDE_SNAP_TOLERANCE_METERS) break;
    }
    if (!best || hit.meters < best.meters) {
      best = { segment: i, t: hit.t, point: hit.point, meters: hit.meters };
    }
  }
  return best && best.meters <= RIDE_SNAP_TOLERANCE_METERS ? best : null;
}

function isClosed(line: LngLat[]): boolean {
  const first = line[0]!;
  const last = line.at(-1)!;
  return (
    distanceMeters(
      { lat: first[1], lon: first[0] },
      { lat: last[1], lon: last[0] },
    ) <= RIDE_SNAP_TOLERANCE_METERS
  );
}

/**
 * The road stretch from `board` to `alight` along `line` (in the direction the
 * line is drawn), or null when either stop is off the line. A closed loop may
 * wrap past its end back to the start.
 */
export function sliceRouteLine(
  line: LngLat[],
  board: LatLon,
  alight: LatLon,
): LngLat[] | null {
  if (line.length < 2) return null;
  // A loop is searched twice round so a ride across the seam stays one piece.
  const path = isClosed(line) ? [...line, ...line.slice(1)] : line;
  const from = firstTouch(path, board, 0, 0);
  if (!from || from.segment >= line.length - 1) return null;
  const to = firstTouch(path, alight, from.segment, from.t);
  if (!to) return null;
  return [
    from.point,
    ...path.slice(from.segment + 1, to.segment + 1),
    to.point,
  ];
}

/** Length of a [lng, lat] polyline in metres. */
export function polylineMeters(line: LngLat[]): number {
  let meters = 0;
  for (let i = 1; i < line.length; i++) {
    meters += distanceMeters(
      { lat: line[i - 1]![1], lon: line[i - 1]![0] },
      { lat: line[i]![1], lon: line[i]![0] },
    );
  }
  return meters;
}
