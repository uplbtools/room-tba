import { asc, eq } from 'drizzle-orm';
import { db } from '#lib/server/db/index.js';
import { jeepneyRoutesTable, jeepneyStopsTable } from '#lib/server/db/schema.js';
import type { RequestHandler } from './$types';

// Inlined from astro src/campus.config.ts campusTransit.enabled: campus
// transit overlay flag (map layer, browse tab, /transit/ links).
const CAMPUS_TRANSIT_ENABLED = true;

export const GET: RequestHandler = async () => {
	if (!CAMPUS_TRANSIT_ENABLED) {
		return new Response('[]', {
			headers: { 'Content-Type': 'application/json' }
		});
	}
	// Inlined from astro transit-service getAllJeepneyRoutes.
	try {
		const [routes, stops] = await Promise.all([
			db
				.select()
				.from(jeepneyRoutesTable)
				.where(eq(jeepneyRoutesTable.isActive, true))
				.orderBy(jeepneyRoutesTable.name),
			db
				.select()
				.from(jeepneyStopsTable)
				.where(eq(jeepneyStopsTable.isActive, true))
				.orderBy(asc(jeepneyStopsTable.routeId), asc(jeepneyStopsTable.sortOrder))
		]);

		const data = routes.map((route) => ({
			id: route.id,
			name: route.name,
			description: route.description,
			directionNote: route.directionNote ?? undefined,
			color: route.color,
			fare: {
				regular: route.fareRegular,
				discounted: route.fareDiscounted
			},
			stops: stops
				.filter((stop) => stop.routeId === route.id)
				.map((stop) => ({
					id: stop.id,
					name: stop.name,
					description: stop.description,
					lat: stop.lat,
					lon: stop.lon,
					sortOrder: stop.sortOrder,
					version: stop.version,
					updatedAt: stop.updatedAt
				}))
		}));

		return new Response(JSON.stringify(data), {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (e) {
		console.error('Failed to load jeepney routes:', e);
		return new Response(JSON.stringify({ error: 'Failed to load transit.' }), {
			status: 503,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
