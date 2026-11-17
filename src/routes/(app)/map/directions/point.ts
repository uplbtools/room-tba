import type * as v from 'valibot';
import type { DirectionsPointSchema } from '#lib/schema/functions.js';

type Point = v.InferInput<typeof DirectionsPointSchema>;

const ENTITY_TYPES = ['building', 'room', 'dorm', 'organization', 'place'] as const;

/** Reads "14.16,121.24" or "building:12". */
export function parsePoint(value: string | null, name?: string | null): Point | null {
	if (!value) return null;
	const [first, second] = value.split(/[,:]/);
	const type = ENTITY_TYPES.find((t) => t === first);
	if (type && /^\d+$/.test(second ?? '')) return { type, id: Number(second) };
	const lat = Number(first);
	const lon = Number(second);
	if (!first || !second || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
	return { lat, lon, name: name?.slice(0, 80) || undefined };
}

/** GPS coords are rounded to about 10 m so a moving fix reuses the same query. */
export function directionsRequest(
	params: Pick<URLSearchParams, 'get'>,
	gps: [number, number] | null
): { from: Point; to: Point } | null {
	const to = parsePoint(params.get('to'), params.get('name'));
	const round = (n: number) => Math.round(n * 1e4) / 1e4;
	const from =
		parsePoint(params.get('from')) ??
		(gps ? { lat: round(gps[1]), lon: round(gps[0]), name: 'Your location' } : null);
	return to && from ? { from, to } : null;
}
