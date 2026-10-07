/** [[west, south], [east, north]], the shape `map.fitBounds` takes. */
export type LngLatBoundsTuple = [[number, number], [number, number]];

/**
 * The box around a set of [lng, lat] points, or null when there are none.
 * Non-finite coordinates (a pin with a missing lat) are skipped.
 */
export function pointsBounds(
  points: Iterable<readonly [number, number]>,
): LngLatBoundsTuple | null {
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;
  for (const [lng, lat] of points) {
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
    if (lng < west) west = lng;
    if (lng > east) east = lng;
    if (lat < south) south = lat;
    if (lat > north) north = lat;
  }
  if (west === Infinity) return null;
  return [
    [west, south],
    [east, north],
  ];
}
