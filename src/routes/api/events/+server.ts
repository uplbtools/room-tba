import { error, json } from '@sveltejs/kit';
import { db } from '#lib/server/db/index.js';
import { collegesTable, eventsTable } from '#lib/server/db/schema.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	try {
		const data = await db.select().from(eventsTable);
		return json(data);
	} catch (e) {
		console.error(e);
		throw error(400, {
			message: 'Cannot query data for colleges'
		});
	}
};
