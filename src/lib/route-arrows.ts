/**
 * Direction arrows for a transit line: one point just past each stop, with the
 * bearing the vehicle travels next. Pure math on [lon, lat] pairs so the map
 * layer only has to draw it.
 */

export type Position = [number, number];
export type RouteArrow = { lon: number; lat: number; bearing: number };

const EARTH_M = 6_371_000;
/** How much farther than the closest pass an earlier pass may be and still win. */
const MATCH_SLACK_M = 25;
const rad = (d: number) => (d * Math.PI) / 180;

function distanceM(a: Position, b: Position): number {
  const dLat = rad(b[1] - a[1]);
  const dLon = rad(b[0] - a[0]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_M * Math.asin(Math.sqrt(h));
}

/** Compass bearing from a to b in degrees, 0 = north, clockwise. */
function bearingDeg(a: Position, b: Position): number {
  const y = Math.sin(rad(b[0] - a[0])) * Math.cos(rad(b[1]));
  const x =
    Math.cos(rad(a[1])) * Math.sin(rad(b[1])) -
    Math.sin(rad(a[1])) * Math.cos(rad(b[1])) * Math.cos(rad(b[0] - a[0]));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/**
 * For each stop except the last, place an arrow `offsetM` metres further along
 * the line than the stop, pointing the way the line continues. Stops are
 * matched in order and never behind the previous stop, so routes that reuse a
 * road in both directions still get arrows on the right pass.
 */
export function stopArrows(
  line: Position[],
  stops: { lat: number; lon: number }[],
  offsetM = 35,
): RouteArrow[] {
  if (line.length < 2 || stops.length < 2) return [];
  const cum = [0];
  for (let i = 1; i < line.length; i++) {
    cum.push(cum[i - 1] + distanceM(line[i - 1], line[i]));
  }
  const total = cum[cum.length - 1];

  // Position along the line (metres) of the closest point to each stop,
  // searching only forward from the previous stop.
  const along: number[] = [];
  let from = 0;
  for (const stop of stops) {
    const p: Position = [stop.lon, stop.lat];
    // Loops pass some places twice (Carabao Park on Kaliwa/Kanan), so keep
    // every forward candidate and take the earliest one that is nearly as
    // close as the best, instead of the single closest which may be the
    // later pass.
    const candidates: { d: number; at: number }[] = [];
    for (let i = 0; i < line.length - 1; i++) {
      if (cum[i + 1] < from) continue;
      const a = line[i];
      const b = line[i + 1];
      // Project in a local flat frame; fine at stop-to-road distances.
      const kx = Math.cos(rad(p[1]));
      const ax = (a[0] - p[0]) * kx;
      const ay = a[1] - p[1];
      const dx = (b[0] - a[0]) * kx;
      const dy = b[1] - a[1];
      const len2 = dx * dx + dy * dy;
      const segLen = cum[i + 1] - cum[i];
      let t =
        len2 === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2));
      // Never match a point behind the previous stop on this segment.
      if (segLen > 0 && cum[i] + t * segLen < from) {
        t = (from - cum[i]) / segLen;
      }
      const q: Position = [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
      const d = distanceM(p, q);
      candidates.push({ d, at: cum[i] + t * segLen });
    }
    const minD = Math.min(...candidates.map((c) => c.d));
    const at = candidates.find((c) => c.d <= minD + MATCH_SLACK_M)?.at ?? from;
    along.push(at);
    from = at;
  }

  const arrows: RouteArrow[] = [];
  for (let s = 0; s < stops.length - 1; s++) {
    // Stay short of the next stop so the arrow never lands on its circle.
    const room = along[s + 1] - along[s];
    if (room < 10) continue;
    const target = Math.min(along[s] + offsetM, along[s] + room / 2, total);
    let i = 0;
    while (i < line.length - 2 && cum[i + 1] < target) i++;
    const segLen = cum[i + 1] - cum[i];
    const t = segLen === 0 ? 0 : (target - cum[i]) / segLen;
    const a = line[i];
    const b = line[i + 1];
    arrows.push({
      lon: a[0] + t * (b[0] - a[0]),
      lat: a[1] + t * (b[1] - a[1]),
      bearing: bearingDeg(a, b),
    });
  }
  return arrows;
}
