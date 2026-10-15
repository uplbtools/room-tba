import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '#lib/server/db/index.js';
import { jeepneyRoutesTable, jeepneyStopsTable } from '#lib/server/db/schema.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const routeId = url.searchParams.get('route_id');
		if (routeId) {
			const stops = await db
				.select()
				.from(jeepneyStopsTable)
				.where(eq(jeepneyStopsTable.routeId, routeId))
				.orderBy(jeepneyStopsTable.sortOrder);
			return json(stops);
		}
		const data = await db.select().from(jeepneyRoutesTable);
		return json(data);
	} catch (e) {
		console.error(e);
		throw error(500, {
			message: 'Cannot query data for jeepney routes'
		});
	}
};
