import { form, query } from '$app/server';
import { RoomProposalSchema, TableIdSchema } from '#lib/schema/functions.js';
import { buildingsTable, divisionsTable, roomsTable } from '#lib/server/db/schema.js';
import { db } from '#lib/utils/db.js';
import { error } from '@sveltejs/kit';
import { updateRoom } from '#lib/services/admin/actions.js';
import { saveEntityEdit } from '#lib/services/contribution/entity-edit.js';
import { eq } from 'drizzle-orm';

/** Every room in one building, with its division name. */
export const getRoomsByBuildingId = query(TableIdSchema, async (id) => {
	return db
		.select({
			id: roomsTable.id,
			code: roomsTable.code,
			divisionName: divisionsTable.divisionName
		})
		.from(roomsTable)
		.leftJoin(divisionsTable, eq(divisionsTable.id, roomsTable.divisionId))
		.where(eq(roomsTable.buildingId, id))
		.orderBy(roomsTable.code);
});

/** One room by id. */
export const getRoomById = query(TableIdSchema, async (id) => {
	const [entry] = await db
		.select({
			id: roomsTable.id,
			code: roomsTable.code,
			directions: roomsTable.directions,
			version: roomsTable.version,
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

/** Editors publish a room edit. Everyone else files it as a proposal for review. */
export const addRoomSuggestion = form(RoomProposalSchema, async ({ meta, body }) => {
	const [current] = await db.select().from(roomsTable).where(eq(roomsTable.id, meta.entityId));
	if (!current) error(404, 'Not found');
	const result = await saveEntityEdit({
		entityType: 'room',
		meta,
		body,
		current,
		publish: (patch, editedBy) => updateRoom(meta.entityId, patch, meta.baseVersion, editedBy)
	});
	if (result.published) await getRoomById(String(meta.entityId)).refresh();
	return result;
});
