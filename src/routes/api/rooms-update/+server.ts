import { count, isNotNull } from 'drizzle-orm';
import { db } from '#lib/server/db/index.js';
import { roomsTable } from '#lib/server/db/schema.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	try {
		const directionRows = await db
			.select({ count: count() })
			.from(roomsTable)
			.where(isNotNull(roomsTable.directions));
		const totalRows = await db.select({ count: count() }).from(roomsTable);

		const directionCount = directionRows[0]?.count ?? 0;
		const totalRooms = totalRows[0]?.count ?? 0;

		return new Response(JSON.stringify({ directionCount, totalRooms }));
	} catch (e) {
		console.error('[rooms-update] count failed:', e);
		return new Response(JSON.stringify({ directionCount: 0, totalRooms: 0 }), {
			status: 503,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
