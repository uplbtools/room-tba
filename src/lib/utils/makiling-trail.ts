/**
 * Measurements for the Makiling trails (#716): length, climb, the elevation
 * profile, Naismith time, a difficulty rating, where each stop sits along
 * the line. Pure, so the panel and the map layer share one set of numbers.
 */
import {
	MAKILING_TRAILS,
	type MakilingTrail,
	type TrailStop
} from '#lib/constants/map/makiling-trail.js';

/** [lng, lat, elevation m] */
export type TrailVertex = readonly [number, number, number];

const EARTH_RADIUS_M = 6_371_008.8;

export function haversineMeters(
	a: readonly [number, number, ...number[]],
	b: readonly [number, number, ...number[]]
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
	distance: number
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
export function sampleProfile(path: readonly TrailVertex[], stepMeters = 50): ProfilePoint[] {
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
		const rise = (profile[i]?.elevation ?? 0) - (profile[i - 1]?.elevation ?? 0);
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
	| 'Easy'
	| 'Moderate'
	| 'Moderately strenuous'
	| 'Strenuous'
	| 'Very strenuous';

/**
 * Shenandoah hiking difficulty: sqrt(gain in feet x 2 x distance in miles)
 * over the whole hike, banded at 50 / 100 / 150 / 200.
 */
export function hikeDifficulty(
	distanceMeters: number,
	gainMeters: number
): { rating: number; label: TrailDifficulty } {
	const feet = gainMeters * 3.28084;
	const miles = distanceMeters / 1609.344;
	const rating = Math.sqrt(feet * 2 * miles);
	const label: TrailDifficulty =
		rating < 50
			? 'Easy'
			: rating < 100
				? 'Moderate'
				: rating < 150
					? 'Moderately strenuous'
					: rating < 200
						? 'Strenuous'
						: 'Very strenuous';
	return { rating, label };
}

/**
 * Where a point falls on the path: meters from the start, how far off the
 * line it is, and the elevation there.
 */
export function projectOntoPath(
	path: readonly TrailVertex[],
	point: readonly [number, number]
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
				: Math.max(0, Math.min(1, ((point[0] - a[0]) * k * dx + (point[1] - a[1]) * dy) / len2));
		const foot: [number, number] = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
		const offset = haversineMeters(foot, point);
		if (offset < best.offset) {
			best = {
				offset,
				distance: (cumulative[i] ?? 0) + haversineMeters([a[0], a[1]], foot)
			};
		}
	}
	return {
		...best,
		elevation: Math.round(elevationAt(path, cumulative, best.distance))
	};
}

export type MeasuredTrailStop = TrailStop & {
	trailId: string;
	/** Meters from the trailhead along the trail. */
	distanceMeters: number;
	/** DEM elevation at the stop, meters above sea level. */
	elevationMeters: number;
};

export type TrailSummary = {
	lengthMeters: number;
	/** What a hiker walks: out and back, or one way for a one-way trail. */
	hikeMeters: number;
	gainMeters: number;
	startElevation: number;
	summitElevation: number;
	naismithHours: number;
	difficulty: TrailDifficulty;
	profile: ProfilePoint[];
};

export function measureTrail(trail: MakilingTrail = defaultTrail()): TrailSummary {
	const { path } = trail;
	const profile = sampleProfile(path, 50);
	const lengthMeters = profile.at(-1)?.distance ?? 0;
	const gainMeters = elevationGain(profile);
	const hikeMeters = trail.oneWay ? lengthMeters : lengthMeters * 2;
	return {
		lengthMeters,
		hikeMeters,
		gainMeters,
		startElevation: path[0]?.[2] ?? 0,
		summitElevation: path.at(-1)?.[2] ?? 0,
		naismithHours: naismithHours(hikeMeters, gainMeters),
		difficulty: hikeDifficulty(hikeMeters, gainMeters).label,
		profile
	};
}

export function measureStops(trail: MakilingTrail = defaultTrail()): MeasuredTrailStop[] {
	return trail.stops.map((stop) => {
		const at = projectOntoPath(trail.path, [stop.lon, stop.lat]);
		return {
			...stop,
			trailId: trail.id,
			distanceMeters: at.distance,
			elevationMeters: at.elevation
		};
	});
}

function defaultTrail(): MakilingTrail {
	return MAKILING_TRAILS[0] as MakilingTrail;
}

/** The trail with this id, else the UPLB trail. */
export function getTrail(id?: string | null): MakilingTrail {
	return MAKILING_TRAILS.find((trail) => trail.id === id) ?? defaultTrail();
}

const summaryCache = new Map<string, TrailSummary>();
const stopsCache = new Map<string, MeasuredTrailStop[]>();

/** A trail's numbers, computed once. */
export function getTrailSummary(id?: string | null): TrailSummary {
	const trail = getTrail(id);
	let summary = summaryCache.get(trail.id);
	if (!summary) {
		summary = measureTrail(trail);
		summaryCache.set(trail.id, summary);
	}
	return summary;
}

/** A trail's stops with distance and elevation, computed once. */
export function getTrailStops(id?: string | null): MeasuredTrailStop[] {
	const trail = getTrail(id);
	let stops = stopsCache.get(trail.id);
	if (!stops) {
		stops = measureStops(trail);
		stopsCache.set(trail.id, stops);
	}
	return stops;
}

/** Any trail's stop by id. */
export function findTrailStop(id: string | null | undefined): MeasuredTrailStop | null {
	if (!id) return null;
	for (const trail of MAKILING_TRAILS) {
		const stop = getTrailStops(trail.id).find((item) => item.id === id);
		if (stop) return stop;
	}
	return null;
}

/**
 * What a ?trail= value or a search row names: a stop, a trail's overview by
 * its id, or (for any other value, "overview" included) the UPLB trail.
 */
export function resolveTrailTarget(value: string | null | undefined): {
	trailId: string;
	stopId: string | null;
} {
	const stop = findTrailStop(value);
	if (stop) return { trailId: stop.trailId, stopId: stop.id };
	return { trailId: getTrail(value).id, stopId: null };
}

/** "Station 11" for numbered stops, else null. */
export function stationLabel(stop: Pick<TrailStop, 'station'>): string | null {
	return stop.station === null ? null : `Station ${stop.station}`;
}

export function formatKm(meters: number): string {
	return `${(meters / 1000).toFixed(meters < 10_000 ? 2 : 1)} km`;
}

export function formatMeters(meters: number): string {
	return `${Math.round(meters).toLocaleString('en-US')} m`;
}

/** "5 h 10 min", rounded to the nearest 10 minutes. */
export function formatHours(hours: number): string {
	const minutes = Math.round((hours * 60) / 10) * 10;
	const h = Math.floor(minutes / 60);
	const m = minutes % 60;
	if (h === 0) return `${m} min`;
	return m === 0 ? `${h} h` : `${h} h ${m} min`;
}
