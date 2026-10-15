import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '#lib/server/db/index.js';
import { eventLocationsTable } from '#lib/server/db/schema.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const eventIdRaw = url.searchParams.get('event_id');
	const eventId = eventIdRaw !== null ? Number(eventIdRaw) : undefined;
	if (eventIdRaw !== null && !Number.isFinite(eventId))
		throw error(400, { message: 'event_id must be a number' });

	try {
		const data = await db
			.select()
			.from(eventLocationsTable)
			.where(eventId !== undefined ? eq(eventLocationsTable.eventId, eventId) : undefined)
			.orderBy(eventLocationsTable.sortOrder);
		return json(data);
	} catch (e) {
		console.error(e);
		throw error(500, {
			message: 'Cannot query data for event locations'
		});
	}
};
