import { query } from '$app/server';
import { error } from '@sveltejs/kit';
import type * as v from 'valibot';
import { getBuildingById } from '#lib/functions/buildings.remote.js';
import { getDormById } from '#lib/functions/dorms.remote.js';
import { getOrgById } from '#lib/functions/organizations.remote.js';
import { getPlaceById } from '#lib/functions/places.remote.js';
import { getRoomById } from '#lib/functions/rooms.remote.js';
import { type DirectionsPointSchema, DirectionsSchema } from '#lib/schema/functions.js';
import { planWalk } from '#lib/utils/travel-graph/engine.js';
import { loadTravelGraph } from '#lib/utils/travel-graph/load.js';

type Pin = { name: string; lat: number; lon: number };

function pin(name: string, at: { lat: number | null; lon: number | null }): Pin {
	if (at.lat === null || at.lon === null) error(422, 'That place has no pin on the map.');
	return { name, lat: at.lat, lon: at.lon };
}

async function resolvePoint(point: v.InferOutput<typeof DirectionsPointSchema>): Promise<Pin> {
	if ('lat' in point) return { name: point.name ?? 'Dropped pin', lat: point.lat, lon: point.lon };
	switch (point.type) {
		case 'building': {
			const building = await getBuildingById(point.id);
			return pin(building.buildingName, building);
		}
		case 'room': {
			const room = await getRoomById(point.id);
			return pin(room.code, room);
		}
		case 'dorm': {
			const dorm = await getDormById(point.id);
			return pin(dorm.dormName, dorm);
		}
		case 'organization': {
			const org = await getOrgById(point.id);
			return pin(org.name, org);
		}
		case 'place': {
			const place = await getPlaceById(point.id);
			return pin(place.name, place);
		}
	}
}

/** Walking route over the campus path network from one point to another. */
export const getWalkingRoute = query(DirectionsSchema, async ({ from, to }) => {
	const [start, end] = await Promise.all([resolvePoint(from), resolvePoint(to)]);
	return { from: start, to: end, plan: planWalk(await loadTravelGraph(), start, end) };
});
