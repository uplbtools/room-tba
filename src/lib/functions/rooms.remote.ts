import { form, query } from '$app/server';
import {
	RoomQueryPaginationSchema,
	RoomProposalSchema,
	TableIdSchema
} from '#lib/schema/functions.js';
import { buildingsTable, editProposalsTable, roomsTable } from '#lib/server/db/schema.js';
import { db } from '#lib/utils/db.js';
import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';

export const getRoomsByBuildingId = query(RoomQueryPaginationSchema, async ({ id, offset = 0 }) => {
	const rows = await db
		.select({ id: roomsTable.id, code: roomsTable.code })
		.from(roomsTable)
		.where(eq(roomsTable.buildingId, id))
		.orderBy(roomsTable.code)
		.limit(10)
		.offset(offset);
	return rows;
});

export const getRoomById = query(TableIdSchema, async (id) => {
	const [entry] = await db
		.select({
			id: roomsTable.id,
			code: roomsTable.code,
			directions: roomsTable.directions,
			buildingId: roomsTable.buildingId,
			buildingName: buildingsTable.buildingName,
			lat: buildingsTable.lat,
			lon: buildingsTable.lon
		})
		.from(roomsTable)
		.leftJoin(buildingsTable, eq(buildingsTable.id, roomsTable.buildingId))
		.where(eq(roomsTable.id, id));

	if (!entry) error(404, 'Not found');

	return entry;
});

export const addRoomSuggestion = form(RoomProposalSchema, async ({ meta, body: proposedPatch }) => {
	try {
		await db.insert(editProposalsTable).values({
			entityType: 'create_room',
			entityId: meta.entityId,
			baseVersion: meta.baseVersion,
			submitterName: meta.submitterName,
			proposedPatch
		});
	} catch {
		error(500, {
			message: 'SERVER ERROR: Cannot add room suggestion'
		});
	}
});
