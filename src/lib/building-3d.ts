import type { LngLat, OsmBuildingFootprint } from "./overpass";
import {
  inferBuildingPlacements,
  maxInferredFloor,
  pointInPolygon as pointInPolygonLocal,
  type RoomPlacementInput,
} from "./room-placement";

export { maxInferredFloor };

export type LocalPolygonData = {
  /** Polygon vertices in local meters (x = east, y = north), centered at origin. */
  points: { x: number; y: number }[];
  /** Width along x (east-west), meters. */
  widthMeters: number;
  /** Depth along y (north-south), meters. */
  depthMeters: number;
  /**
   * Latitude of the polygon's centroid — i.e., the lat that maps to the
   * polygon's local (0, 0). Use this (not whatever the caller passed in) to
   * align overlays like a basemap, otherwise things drift relative to the
   * polygon by a few meters.
   */
  centerLat: number;
  /** Longitude of the polygon's centroid. */
  centerLon: number;
};

export type RoomPlacement = {
  code: string;
  /** 1-indexed floor (1 = ground). */
  floor: number;
  /** Local meters, relative to building centroid. */
  x: number;
  y: number;
};

const METERS_PER_DEGREE_LAT = 111_320;

function getCentroid(cycle: LngLat[]): [number, number] {
  let centroidX = 0,
    centroidY = 0;
  for (const [lon, lat] of cycle) {
    centroidX += lon;
    centroidY += lat;
  }
  centroidX /= cycle.length;
  centroidY /= cycle.length;
  return [centroidX, centroidY];
}

/**
 * Project an OSM polygon (lng, lat) into local meters centered at the polygon's
 * centroid. Uses an equirectangular projection scaled to `cos(centroidLat)` for
 * the longitude direction, which is plenty accurate at building scale.
 */
export function footprintToLocalPolygon(
  footprint: OsmBuildingFootprint,
): LocalPolygonData {
  const cycle = footprint.outline;
  const [centroidX, centroidY] = getCentroid(cycle);

  const lonScale =
    Math.cos((centroidY * Math.PI) / 180) * METERS_PER_DEGREE_LAT;
  const latScale = METERS_PER_DEGREE_LAT;

  const points: { x: number; y: number }[] = [];
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (let i = 0; i < cycle.length; i++) {
    const [lon, lat] = cycle[i] as LngLat;
    const next = cycle[(i + 1) % cycle.length] as LngLat;
    if (
      i === cycle.length - 1 &&
      lon === cycle[0]?.[0] &&
      lat === cycle[0]?.[1]
    ) {
      continue;
    }
    const x = (lon - centroidX) * lonScale;
    const y = (lat - centroidY) * latScale;
    points.push({ x, y });
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    if (next === cycle[i]) break;
  }

  return {
    points,
    widthMeters: maxX - minX,
    depthMeters: maxY - minY,
    centerLat: centroidY,
    centerLon: centroidX,
  };
}

/** Mulberry32 — small deterministic PRNG seeded by string hash. */
function seededRng(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let state = h >>> 0;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Place every room of a building inside the polygon.
 *
 * Three tiers, best first:
 *  1. `overrides` — positions saved by an editor. Always win.
 *  2. Inference (`inferBuildingPlacements`) — floor from the room code or
 *     directions, x/y from the corridor heuristic.
 *  3. Seeded random inside the polygon, round-robined across floors, for codes
 *     that say nothing (`CDC DECIMU`). Visibly arbitrary, but the room still
 *     exists in the model instead of vanishing.
 */
export function placeRooms(
  rooms: RoomPlacementInput[],
  polygon: LocalPolygonData,
  floorCount: number,
  overrides?: Map<string, { floor: number; x: number; y: number }>,
): RoomPlacement[] {
  if (rooms.length === 0 || polygon.points.length === 0) return [];

  const floors = Math.max(1, Math.floor(floorCount));
  const skip = new Set(overrides?.keys() ?? []);
  const inferred = inferBuildingPlacements(rooms, polygon, floors, skip);

  // Codes with neither an override nor a signal get round-robined across
  // floors so they're not all stacked on floor 1.
  const buckets: string[][] = Array.from({ length: floors }, () => []);
  let rrIndex = 0;
  for (const room of rooms) {
    if (skip.has(room.roomCode) || inferred.has(room.roomCode)) continue;
    const floor = (rrIndex % floors) + 1;
    rrIndex++;
    buckets[floor - 1]?.push(room.roomCode);
  }

  // Compute polygon bounding box for sampling.
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of polygon.points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;

  const placements: RoomPlacement[] = [];

  // Emit overrides first so they always appear (even if their saved floor is
  // outside the current `floors` count, we clamp it).
  if (overrides) {
    for (const { roomCode } of rooms) {
      const o = overrides.get(roomCode);
      if (!o) continue;
      placements.push({
        code: roomCode,
        floor: Math.max(1, Math.min(floors, Math.floor(o.floor))),
        x: o.x,
        y: o.y,
      });
    }
  }

  for (const [code, placement] of inferred) {
    placements.push({
      code,
      floor: placement.floor,
      x: placement.posX,
      y: placement.posY,
    });
  }

  for (let f = 1; f <= floors; f++) {
    const codesOnFloor = buckets[f - 1] ?? [];
    if (codesOnFloor.length === 0) continue;

    for (const code of codesOnFloor) {
      const rng = seededRng(`${code}|${f}`);
      let placed: { x: number; y: number } | null = null;
      // Try up to 20 samples to land inside the polygon.
      for (let attempt = 0; attempt < 20; attempt++) {
        const sx = minX + rng() * spanX;
        const sy = minY + rng() * spanY;
        if (pointInPolygonLocal({ x: sx, y: sy }, polygon.points)) {
          placed = { x: sx, y: sy };
          break;
        }
      }
      // Fallback to centroid if sampling failed.
      if (!placed) {
        const cx =
          polygon.points.reduce((s, p) => s + p.x, 0) / polygon.points.length;
        const cy =
          polygon.points.reduce((s, p) => s + p.y, 0) / polygon.points.length;
        placed = { x: cx, y: cy };
      }
      placements.push({ code, floor: f, x: placed.x, y: placed.y });
    }
  }

  return placements;
}

/** Side length (metres) of the stand-in footprint used when OSM has nothing. */
const APPROX_FOOTPRINT_SIDE_M = 36;

/**
 * A deliberately plain square around the building's own lat/lon, for the ~3
 * class buildings OpenStreetMap has not mapped yet. It is not the real shape
 * and must always be labelled as approximate in the UI — the point is that
 * rooms can still be placed and browsed instead of dead-ending on an error.
 *
 * ponytail: a square, not a guessed outline. Replace it by mapping the building
 * in OSM, not by inventing more geometry here.
 */
export function approximateFootprint(
  lat: number,
  lon: number,
  sideMeters = APPROX_FOOTPRINT_SIDE_M,
): OsmBuildingFootprint {
  const half = sideMeters / 2;
  const dLat = half / METERS_PER_DEGREE_LAT;
  const dLon = half / (Math.cos((lat * Math.PI) / 180) * METERS_PER_DEGREE_LAT);
  const outline: LngLat[] = [
    [lon - dLon, lat - dLat],
    [lon + dLon, lat - dLat],
    [lon + dLon, lat + dLat],
    [lon - dLon, lat + dLat],
    [lon - dLon, lat - dLat],
  ];
  return {
    outline,
    levels: null,
    heightMeters: null,
    osmName: null,
    containsPoint: true,
  };
}

/** Decide a floor count if OSM didn't tell us. */
export function defaultFloorCount(
  footprint: OsmBuildingFootprint,
  inferredMax: number | null,
): number {
  if (footprint.levels && footprint.levels > 0) return footprint.levels;
  if (footprint.heightMeters) {
    return Math.max(1, Math.round(footprint.heightMeters / 3.5));
  }
  if (inferredMax && inferredMax > 0) return inferredMax;
  return 3;
}

/** A label's screen-space box, in CSS pixels. */
export type LabelBox = {
  /** Centre of the label on screen. */
  x: number;
  y: number;
  width: number;
  height: number;
  /**
   * Lower wins the space when two labels collide. The viewer uses 0 for floor
   * markers, 1 for room pins and -1 for the active/hovered room.
   */
  rank: number;
  /** Distance from the camera; nearer labels win ties. */
  depth: number;
};

/**
 * Greedy screen-space label declutter: walk the labels best-first and keep one
 * only if its box misses everything already kept.
 *
 * The 3D viewer draws one label per room, so a building with a few dozen rooms
 * painted an illegible pile (Physical Sciences: 33 labels, 415 overlapping
 * pairs at 320px). Returns the indices to keep, in input order.
 *
 * ponytail: O(n²) against the kept set. Fine for the tens of labels a building
 * has; swap in a grid index if one ever has hundreds.
 */
export function pickNonOverlappingLabels(labels: LabelBox[]): number[] {
  const order = labels
    .map((label, index) => ({ label, index }))
    .sort(
      (a, b) =>
        a.label.rank - b.label.rank ||
        a.label.depth - b.label.depth ||
        a.index - b.index,
    );

  const kept: Array<{ l: number; r: number; t: number; b: number }> = [];
  const keptIndices: number[] = [];

  for (const { label, index } of order) {
    const box = {
      l: label.x - label.width / 2,
      r: label.x + label.width / 2,
      t: label.y - label.height / 2,
      b: label.y + label.height / 2,
    };
    const clashes = kept.some(
      (other) =>
        box.l < other.r &&
        other.l < box.r &&
        box.t < other.b &&
        other.t < box.b,
    );
    if (clashes) continue;
    kept.push(box);
    keptIndices.push(index);
  }

  return keptIndices.sort((a, b) => a - b);
}

/**
 * Camera distance that fits a sphere of `radius` meters into the part of the
 * canvas the user can actually see, the way MapLibre's `fitBounds` honours
 * `padding`. On phones the bottom sheet covers the lower half of the 3D stage;
 * framing against the full canvas left the building small and pushed into the
 * strip behind the sheet.
 *
 * `fill` is the share of the visible height (or width, whichever is tighter)
 * the sphere's diameter should take.
 */
export function cameraFitDistance(opts: {
  radius: number;
  /** Vertical field of view, degrees. */
  fovDeg: number;
  width: number;
  height: number;
  padTop?: number;
  padBottom?: number;
  fill?: number;
}): number {
  const { radius, fovDeg, width, height } = opts;
  const fill = opts.fill ?? 0.65;
  if (width <= 0 || height <= 0) return radius * 3;
  const visibleH = Math.max(
    height * 0.2,
    height - (opts.padTop ?? 0) - (opts.padBottom ?? 0),
  );
  const tanHalf = Math.tan((fovDeg * Math.PI) / 360);
  // Half-angle tangents of the visible window; the narrower axis decides.
  const fit = fill * tanHalf * (Math.min(visibleH, width) / height);
  return radius / fit;
}

/**
 * Should a room's label be drawn? The map labels the same rooms the list
 * shows: every room on the selected floor. "All floors" stacks every storey on
 * one footprint, so only the room the user picked (or hovers) gets a label
 * there; the rest stay plain markers instead of a pile of overlapping chips.
 */
export function isRoomLabelShown(opts: {
  floor: number;
  selectedFloor: number | "all";
  focused: boolean;
}): boolean {
  if (opts.focused) return true;
  return opts.selectedFloor !== "all" && opts.floor === opts.selectedFloor;
}
