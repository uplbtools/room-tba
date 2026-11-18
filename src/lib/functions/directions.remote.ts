import { query } from '$app/server';
import { error } from '@sveltejs/kit';
import type * as v from 'valibot';
import { getBuildingById } from '#lib/functions/buildings.remote.js';
import { getDormById } from '#lib/functions/dorms.remote.js';
import { getOrgById } from '#lib/functions/organizations.remote.js';
import { getPlaceById } from '#lib/functions/places.remote.js';
import { getRoomById } from '#lib/functions/rooms.remote.js';
import {
	type DirectionsPointSchema,
	DirectionsSchema,
	RoomWalkSchema
} from '#lib/schema/functions.js';
import { buildingsTable, roomsTable } from '#lib/server/db/schema.js';
import { db } from '#lib/utils/db.js';
import { eq, inArray } from 'drizzle-orm';
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

/** Walking seconds between two rooms' buildings, or null in the same building, with no pin or with no route. */
export const getRoomWalkSeconds = query(RoomWalkSchema, async ({ from, to }) => {
	const rows = await db
		.select({ code: roomsTable.code, lat: buildingsTable.lat, lon: buildingsTable.lon })
		.from(roomsTable)
		.innerJoin(buildingsTable, eq(buildingsTable.id, roomsTable.buildingId))
		.where(inArray(roomsTable.code, [from, to]));
	const start = rows.find((row) => row.code === from);
	const end = rows.find((row) => row.code === to);
	if (start?.lat == null || start.lon == null || end?.lat == null || end.lon == null) return null;
	if (start.lat === end.lat && start.lon === end.lon) return null;
	const plan = planWalk(
		await loadTravelGraph(),
		{ lat: start.lat, lon: start.lon },
		{ lat: end.lat, lon: end.lon }
	);
	return plan.status === 'ok' ? plan.route.seconds : null;
});
