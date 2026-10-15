import { error, json } from '@sveltejs/kit';
import { db } from '#lib/server/db/index.js';
import { buildingsTable } from '#lib/server/db/schema.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	try {
		const data = await db.select().from(buildingsTable);
		return json(data);
	} catch (e) {
		console.error(e);
		throw error(500, {
			message: 'Cannot query data for buildings'
		});
	}
};
