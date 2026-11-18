import { query } from '$app/server';
import { error } from '@sveltejs/kit';
import type * as v from 'valibot';
import { getBuildingById } from '#lib/functions/buildings.remote.js';
import { getDormById } from '#lib/functions/dorms.remote.js';
import { getOrgById } from '#lib/functions/organizations.remote.js';
import { getPlaceById } from '#lib/functions/places.remote.js';
import { getRoomById } from '#lib/functions/rooms.remote.js';
import { getTransitRoute, getTransitRoutes } from '#lib/functions/transit.remote.js';
import {
	type DirectionsPointSchema,
	DirectionsSchema,
	RoomCodesSchema
} from '#lib/schema/functions.js';
import { buildingsTable, roomsTable } from '#lib/server/db/schema.js';
import { db } from '#lib/utils/db.js';
import { eq, inArray } from 'drizzle-orm';
import { transitRouteKind } from '#lib/utils/transit/transit-route-kind.js';
import { planWalk } from '#lib/utils/travel-graph/engine.js';
import { planJeepRide } from '#lib/utils/travel-graph/journey.js';
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

/** The fastest walk, ride, walk trip on a campus jeep, or null when walking is as quick. */
export const getJeepRide = query(DirectionsSchema, async (request) => {
	const [{ from, to, plan }, graph, routes] = await Promise.all([
		getWalkingRoute(request),
		loadTravelGraph(),
		getTransitRoutes()
	]);
	if (plan.status !== 'ok') return null;
	const campus = await Promise.all(
		routes.filter((route) => transitRouteKind(route) === 'campus').map((r) => getTransitRoute(r.id))
	);
	const lines = Object.fromEntries(
		campus.map((r) => [r.id, (r.geometry.line?.coordinates as [number, number][]) ?? null])
	);
	return planJeepRide(graph, from, to, campus, lines, plan.route.seconds);
});

/** Whole walking minutes between rooms in different buildings, keyed "from|to". */
export const getRoomWalkMinutes = query(RoomCodesSchema, async (codes) => {
	const rooms = await db
		.select({ code: roomsTable.code, lat: buildingsTable.lat, lon: buildingsTable.lon })
		.from(roomsTable)
		.innerJoin(buildingsTable, eq(buildingsTable.id, roomsTable.buildingId))
		.where(inArray(roomsTable.code, codes));
	const graph = await loadTravelGraph();
	const byBuilding = new Map<string, number | null>();
	const minutes: Record<string, number> = {};
	for (const from of rooms) {
		for (const to of rooms) {
			if (from.lat == null || from.lon == null || to.lat == null || to.lon == null) continue;
			if (from.lat === to.lat && from.lon === to.lon) continue;
			const key = `${from.lat},${from.lon}|${to.lat},${to.lon}`;
			if (!byBuilding.has(key)) {
				const plan = planWalk(
					graph,
					{ lat: from.lat, lon: from.lon },
					{ lat: to.lat, lon: to.lon }
				);
				byBuilding.set(key, plan.status === 'ok' ? Math.ceil(plan.route.seconds / 60) : null);
			}
			const walk = byBuilding.get(key);
			if (walk != null) minutes[`${from.code}|${to.code}`] = walk;
		}
	}
	return minutes;
});
