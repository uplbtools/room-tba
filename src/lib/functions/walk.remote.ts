import { query } from '$app/server';
import { RoomCodesSchema } from '#lib/schema/functions.js';
import { buildingsTable, roomsTable } from '#lib/server/db/schema.js';
import { db } from '#lib/utils/db.js';
import { planWalk } from '#lib/utils/travel-graph/engine.js';
import { loadTravelGraph } from '#lib/utils/travel-graph/load.js';
import { eq, inArray } from 'drizzle-orm';

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
