/**
 * Measurements for the Makiling trail (#716): length, climb, the elevation
 * profile, Naismith time, a difficulty rating, where each stop sits along
 * the line, and search over stop names. Pure, so the panel, the map layer
 * and search share one set of numbers.
 */
import { MAKILING_TRAIL_PATH } from "@constants/makiling-trail-path";
import {
  MAKILING_TRAIL_NAME,
  MAKILING_TRAIL_STOPS,
  type TrailStop,
} from "@constants/makiling-trail";
import { MATCH, nameMatchScore } from "./search-suggestions";

/** [lng, lat, elevation m] */
export type TrailVertex = readonly [number, number, number];

const EARTH_RADIUS_M = 6_371_008.8;

export function haversineMeters(
  a: readonly [number, number, ...number[]],
  b: readonly [number, number, ...number[]],
): number {
  const toRad = Math.PI / 180;
  const dLat = (b[1] - a[1]) * toRad;
  const dLon = (b[0] - a[0]) * toRad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a[1] * toRad) * Math.cos(b[1] * toRad) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/** Distance from the first vertex to each vertex, in meters. */
export function cumulativeDistances(path: readonly TrailVertex[]): number[] {
  const out: number[] = [];
  let total = 0;
  path.forEach((vertex, index) => {
    const prev = path[index - 1];
    if (prev) total += haversineMeters(prev, vertex);
    out.push(total);
  });
  return out;
}

export type ProfilePoint = { distance: number; elevation: number };

/** Elevation at `distance` along the path, linearly between vertices. */
function elevationAt(
  path: readonly TrailVertex[],
  cumulative: readonly number[],
  distance: number,
): number {
  if (path.length === 0) return 0;
  const last = path.length - 1;
  if (distance <= 0) return path[0]?.[2] ?? 0;
  if (distance >= (cumulative[last] ?? 0)) return path[last]?.[2] ?? 0;
  let lo = 0;
  let hi = last;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if ((cumulative[mid] ?? 0) <= distance) lo = mid;
    else hi = mid;
  }
  const d0 = cumulative[lo] ?? 0;
  const d1 = cumulative[hi] ?? d0;
  const e0 = path[lo]?.[2] ?? 0;
  const e1 = path[hi]?.[2] ?? e0;
  const t = d1 > d0 ? (distance - d0) / (d1 - d0) : 0;
  return e0 + (e1 - e0) * t;
}

/**
 * The profile resampled every `stepMeters` (plus the exact end). Even spacing
 * keeps the chart honest and smooths single-cell DEM noise out of the climb.
 */
export function sampleProfile(
  path: readonly TrailVertex[],
  stepMeters = 50,
): ProfilePoint[] {
  if (path.length === 0 || stepMeters <= 0) return [];
  const cumulative = cumulativeDistances(path);
  const total = cumulative.at(-1) ?? 0;
  const out: ProfilePoint[] = [];
  for (let distance = 0; distance < total; distance += stepMeters) {
    out.push({ distance, elevation: elevationAt(path, cumulative, distance) });
  }
  out.push({ distance: total, elevation: path.at(-1)?.[2] ?? 0 });
  return out;
}

/** Total climb (sum of rises) over a profile, in meters. */
export function elevationGain(profile: readonly ProfilePoint[]): number {
  let gain = 0;
  for (let i = 1; i < profile.length; i++) {
    const rise =
      (profile[i]?.elevation ?? 0) - (profile[i - 1]?.elevation ?? 0);
    if (rise > 0) gain += rise;
  }
  return gain;
}

/**
 * Naismith's rule: 1 hour per 5 km walked plus 1 hour per 600 m climbed.
 * Descent is free in the basic rule.
 */
export function naismithHours(distanceMeters: number, gainMeters: number) {
  return distanceMeters / 5000 + gainMeters / 600;
}

export type TrailDifficulty =
  | "Easy"
  | "Moderate"
  | "Moderately strenuous"
  | "Strenuous"
  | "Very strenuous";

/**
 * Shenandoah hiking difficulty: sqrt(gain in feet x 2 x distance in miles)
 * over the whole hike, banded at 50 / 100 / 150 / 200.
 */
export function hikeDifficulty(
  distanceMeters: number,
  gainMeters: number,
): { rating: number; label: TrailDifficulty } {
  const feet = gainMeters * 3.28084;
  const miles = distanceMeters / 1609.344;
  const rating = Math.sqrt(feet * 2 * miles);
  const label: TrailDifficulty =
    rating < 50
      ? "Easy"
      : rating < 100
        ? "Moderate"
        : rating < 150
          ? "Moderately strenuous"
          : rating < 200
            ? "Strenuous"
            : "Very strenuous";
  return { rating, label };
}

/**
 * Where a point falls on the path: meters from the start, how far off the
 * line it is, and the elevation there.
 */
export function projectOntoPath(
  path: readonly TrailVertex[],
  point: readonly [number, number],
): { distance: number; offset: number; elevation: number } {
  const cumulative = cumulativeDistances(path);
  // Local equirectangular frame: fine at trail scale (a few km).
  const k = Math.cos((point[1] * Math.PI) / 180);
  let best = { distance: 0, offset: Number.POSITIVE_INFINITY };
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    if (!a || !b) continue;
    const dx = (b[0] - a[0]) * k;
    const dy = b[1] - a[1];
    const len2 = dx * dx + dy * dy;
    const t =
      len2 === 0
        ? 0
        : Math.max(
            0,
            Math.min(
              1,
              ((point[0] - a[0]) * k * dx + (point[1] - a[1]) * dy) / len2,
            ),
          );
    const foot: [number, number] = [
      a[0] + (b[0] - a[0]) * t,
      a[1] + (b[1] - a[1]) * t,
    ];
    const offset = haversineMeters(foot, point);
    if (offset < best.offset) {
      best = {
        offset,
        distance: (cumulative[i] ?? 0) + haversineMeters([a[0], a[1]], foot),
      };
    }
  }
  return {
    ...best,
    elevation: Math.round(elevationAt(path, cumulative, best.distance)),
  };
}

export type MeasuredTrailStop = TrailStop & {
  /** Meters from Station 1 along the trail. */
  distanceMeters: number;
  /** DEM elevation at the stop, meters above sea level. */
  elevationMeters: number;
};

export type TrailSummary = {
  lengthMeters: number;
  /** Out and back: up to Peak 2 and down the same way. */
  roundTripMeters: number;
  gainMeters: number;
  startElevation: number;
  summitElevation: number;
  naismithHours: number;
  difficulty: TrailDifficulty;
  profile: ProfilePoint[];
};

export function measureTrail(
  path: readonly TrailVertex[] = MAKILING_TRAIL_PATH,
): TrailSummary {
  const profile = sampleProfile(path, 50);
  const lengthMeters = profile.at(-1)?.distance ?? 0;
  const gainMeters = elevationGain(profile);
  const roundTripMeters = lengthMeters * 2;
  return {
    lengthMeters,
    roundTripMeters,
    gainMeters,
    startElevation: path[0]?.[2] ?? 0,
    summitElevation: Math.max(...path.map((vertex) => vertex[2])),
    naismithHours: naismithHours(roundTripMeters, gainMeters),
    difficulty: hikeDifficulty(roundTripMeters, gainMeters).label,
    profile,
  };
}

export function measureStops(
  stops: readonly TrailStop[] = MAKILING_TRAIL_STOPS,
  path: readonly TrailVertex[] = MAKILING_TRAIL_PATH,
): MeasuredTrailStop[] {
  return stops.map((stop) => {
    const at = projectOntoPath(path, [stop.lon, stop.lat]);
    return {
      ...stop,
      distanceMeters: at.distance,
      elevationMeters: at.elevation,
    };
  });
}

let summaryCache: TrailSummary | null = null;
let stopsCache: MeasuredTrailStop[] | null = null;

/** The Makiling trail's numbers, computed once. */
export function getTrailSummary(): TrailSummary {
  summaryCache ??= measureTrail();
  return summaryCache;
}

/** The Makiling trail's stops with distance and elevation, computed once. */
export function getTrailStops(): MeasuredTrailStop[] {
  stopsCache ??= measureStops();
  return stopsCache;
}

export function findTrailStop(
  id: string | null | undefined,
): MeasuredTrailStop | null {
  if (!id) return null;
  return getTrailStops().find((stop) => stop.id === id) ?? null;
}

/** The stop for a directory place (trailhead, Peak 2), if the trail has one. */
export function trailStopForPlace(
  placeName: string | null | undefined,
): MeasuredTrailStop | null {
  if (!placeName) return null;
  return (
    getTrailStops().find(
      (stop) =>
        stop.placeName === placeName || stop.sideTripPlaceName === placeName,
    ) ?? null
  );
}

/** "Station 11" for numbered stops, else null. */
export function stationLabel(stop: Pick<TrailStop, "station">): string | null {
  return stop.station === null ? null : `Station ${stop.station}`;
}

export function formatKm(meters: number): string {
  return `${(meters / 1000).toFixed(meters < 10_000 ? 2 : 1)} km`;
}

export function formatMeters(meters: number): string {
  return `${Math.round(meters).toLocaleString("en-US")} m`;
}

/** "5 h 10 min", rounded to the nearest 10 minutes. */
export function formatHours(hours: number): string {
  const minutes = Math.round((hours * 60) / 10) * 10;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export type TrailSearchHit = {
  /** null = the whole trail. */
  stopId: string | null;
  label: string;
  secondary: string;
  score: number;
  /** Where the row's pin is (the trailhead for the whole trail). */
  lat: number;
  lon: number;
};

const TRAIL_ALIASES = [
  MAKILING_TRAIL_NAME,
  "Trail",
  "Mt. Makiling trail",
  "Mount Makiling trail",
  "UPLB trail",
  "Peak 2 trail",
  "Hiking trail",
];

/**
 * Best score, word starts only: short stop names would otherwise answer
 * every two-letter query mid-word ("PS" in "campsite").
 */
function bestOf(scores: (number | null)[]): number | null {
  const hits = scores.filter(
    (score): score is number => score !== null && score < MATCH.midWord,
  );
  return hits.length ? Math.min(...hits) : null;
}

/**
 * Trail and stop matches for the search box. "Makiling trail", "Agila",
 * "Malaboo", "Peak 2", "station 11" and "11" all land somewhere useful.
 */
export function searchTrail(query: string): TrailSearchHit[] {
  const needle = query.trim().toLowerCase();
  if (needle === "") return [];
  const hits: TrailSearchHit[] = [];
  const trailScore = bestOf(
    TRAIL_ALIASES.map((alias) => nameMatchScore(alias, needle)),
  );
  const trailhead = getTrailStops()[0];
  if (trailScore !== null && trailhead) {
    hits.push({
      lat: trailhead.lat,
      lon: trailhead.lon,
      stopId: null,
      label: MAKILING_TRAIL_NAME,
      secondary: "Hiking trail to Peak 2",
      score: trailScore,
    });
  }
  const stationQuery = /^(?:station\s*|st\.?\s*)?(\d{1,2})$/.exec(needle);
  for (const stop of getTrailStops()) {
    const numbered = stationLabel(stop);
    const score = bestOf([
      nameMatchScore(stop.name, needle),
      ...(stop.aliases ?? []).map((alias) => nameMatchScore(alias, needle)),
      numbered ? nameMatchScore(numbered, needle) : null,
      stationQuery && stop.station === Number(stationQuery[1])
        ? MATCH.exact
        : null,
    ]);
    if (score === null) continue;
    hits.push({
      lat: stop.lat,
      lon: stop.lon,
      stopId: stop.id,
      label: stop.name,
      secondary: [
        MAKILING_TRAIL_NAME,
        numbered && !stop.name.includes(numbered) ? numbered : null,
        formatKm(stop.distanceMeters),
      ]
        .filter(Boolean)
        .join(", "),
      score,
    });
  }
  return hits;
}
