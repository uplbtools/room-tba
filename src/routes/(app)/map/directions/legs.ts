import type { JeepJourney } from '#lib/utils/travel-graph/journey.js';

type LngLat = [number, number];
type Point = { lat: number; lon: number };

const WALK_COLOR = '#2563eb';

/** The jeep trip unless the rider asked for walking with `?mode=walk`. */
export function usesJeep(params: Pick<URLSearchParams, 'get'>, jeep: JeepJourney | null) {
	return jeep !== null && params.get('mode') !== 'walk';
}

/** The lines to draw, each joined to the trip ends and coloured by walk or route. */
export function routeLegs(
	from: Point,
	to: Point,
	walk: LngLat[],
	jeep: JeepJourney | null
): { color: string; coordinates: LngLat[] }[] {
	const start: LngLat = [from.lon, from.lat];
	const end: LngLat = [to.lon, to.lat];
	if (!jeep) return [{ color: WALK_COLOR, coordinates: [start, ...walk, end] }];
	return jeep.legs.map((leg, i) => ({
		color: leg.kind === 'ride' ? leg.color : WALK_COLOR,
		coordinates: [...(i === 0 ? [start] : []), ...leg.coordinates, ...(i === 2 ? [end] : [])]
	}));
}
