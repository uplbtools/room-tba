import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '#lib/server/db/index.js';
import { eventRouteStopsTable } from '#lib/server/db/schema.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const routeIdRaw = url.searchParams.get('route_id');
	const routeId = routeIdRaw !== null ? Number(routeIdRaw) : undefined;
	if (routeIdRaw !== null && !Number.isFinite(routeId))
		throw error(400, { message: 'route_id must be a number' });

	try {
		const data = await db
			.select()
			.from(eventRouteStopsTable)
			.where(routeId !== undefined ? eq(eventRouteStopsTable.routeId, routeId) : undefined)
			.orderBy(eventRouteStopsTable.sortOrder);
		return json(data);
	} catch (e) {
		console.error(e);
		throw error(500, {
			message: 'Cannot query data for event route stops'
		});
	}
};
