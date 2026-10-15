import { and, eq, sql } from 'drizzle-orm';
import { db } from '#lib/server/db/index.js';
import { classesTable, roomsTable } from '#lib/server/db/schema.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const buildingId = url.searchParams.get('building_id');
	const collegeId = url.searchParams.get('college_id');
	const divisionId = url.searchParams.get('division_id');
	const termIdRaw = url.searchParams.get('term_id');
	const termId = termIdRaw !== null && termIdRaw !== '' ? Number(termIdRaw) : undefined;

	let entityName: 'building' | 'college' | 'division';
	let id: number;
	if (buildingId !== null) {
		entityName = 'building';
		id = Number(buildingId);
	} else if (collegeId !== null) {
		entityName = 'college';
		id = Number(collegeId);
	} else if (divisionId !== null) {
		entityName = 'division';
		id = Number(divisionId);
	} else {
		return new Response(JSON.stringify({ error: 'Missing entity filter', success: false }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	if (!Number.isFinite(id)) {
		return new Response(JSON.stringify({ error: 'Invalid entity id', success: false }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	try {
		// Inlined from astro map-data-service getRoomClassCounts (#342): one
		// grouped LEFT JOIN query; rooms with no classes included with count 0.
		const scopedTermId = Number.isFinite(termId) ? termId : undefined;
		const column =
			entityName === 'building'
				? roomsTable.buildingId
				: entityName === 'college'
					? roomsTable.collegeId
					: roomsTable.divisionId;
		const rows = await db
			.select({
				roomId: roomsTable.id,
				count: sql<number>`count(${classesTable.id})::int`
			})
			.from(roomsTable)
			.leftJoin(
				classesTable,
				and(
					eq(classesTable.roomId, roomsTable.id),
					scopedTermId != null ? eq(classesTable.termId, scopedTermId) : undefined
				)
			)
			.where(eq(column, id))
			.groupBy(roomsTable.id);
		const data = rows.map((row) => ({
			roomId: row.roomId,
			count: row.count
		}));
		return new Response(JSON.stringify({ data, success: true }, null, 2), {
			headers: [
				['Access-Control-Allow-Origin', '*'],
				['Content-Type', 'application/json']
			]
		});
	} catch (e) {
		console.error('Error: ', e);
		return new Response(JSON.stringify({ error: 'Failed to fetch class counts', success: false }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
