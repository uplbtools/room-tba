import { form, query } from '$app/server';
import { db } from '#lib/utils/db.js';
import { buildingsTable, editorHistoryTable, editProposalsTable, roomsTable } from '#lib/server/db/schema.js';
import { and, desc, eq, getTableColumns, sql } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import { updateBuilding } from '#lib/services/admin/actions.js';
import { saveEntityEdit } from '#lib/services/contribution/entity-edit.js';
import { BuildingProposalSchema, ListQuerySchema, TableIdSchema } from '#lib/schema/functions.js';

/** Id, name and coordinates of every building, for the map pins. */
export const getMapBuildingsData = query(async () => {
	const rows = await db
		.select({
			id: buildingsTable.id,
			lon: buildingsTable.lon,
			lat: buildingsTable.lat,
			buildingName: buildingsTable.buildingName
		})
		.from(buildingsTable);
	return rows;
});

/** One building by id. Responds 404 when it doesn't exist. */
export const getBuildingById = query(TableIdSchema, async (id) => {

	// const [buildingData] = await db.select().from(buildingsTable).where(eq(buildingsTable.id, id));

	// const [row] = await db
	// 	.select({
	// 		editedBy: editorHistoryTable.editedBy,
	// 		createdAt: editorHistoryTable.createdAt
	// 	})
	// 	.from(editorHistoryTable)
	// 	.where(
	// 		and(
	// 			eq(editorHistoryTable.entityType, "building"),
	// 			eq(editorHistoryTable.entityId, id)
	// 		)
	// 	)
	// 	.orderBy(desc(editorHistoryTable.createdAt), desc(editorHistoryTable.id))
	// 	.limit(1);

	const [buildingData] = await db
		.select({
			...getTableColumns(buildingsTable),
			lastEditedBy: editorHistoryTable.editedBy,
			updatedAt: editorHistoryTable.createdAt
		})
		.from(buildingsTable)
		.leftJoin(
			editorHistoryTable, 
			and(
				eq(editorHistoryTable.entityId, buildingsTable.id),
				eq(editorHistoryTable.entityType, sql`'building'`)
			)
		)
		.where(eq(buildingsTable.id, id))
		.orderBy(desc(editorHistoryTable.createdAt));
	if (!buildingData) error(404, 'Not found');
	return { ...buildingData};
});

/** One page of buildings by name, 8 per page. */
export const getBuildingsList = query(ListQuerySchema, async(offset = 0) => {
	const rows = await db
		.select()
		.from(buildingsTable)
		.orderBy(buildingsTable.buildingName)
		.limit(8)
		.offset(8 * offset);
	return rows;
})

/** Editors publish a building edit. Everyone else files it as a proposal for review. */
export const addBuildingSuggestion = form(BuildingProposalSchema, async ({ meta, body }) => {
	const [current] = await db
		.select()
		.from(buildingsTable)
		.where(eq(buildingsTable.id, meta.entityId));
	if (!current) error(404, 'Not found');
	const result = await saveEntityEdit({
		entityType: 'building',
		meta,
		body,
		current,
		publish: (patch, editedBy) => updateBuilding(meta.entityId, patch, meta.baseVersion, editedBy)
	});
	if (result.published) {
		await getBuildingById(String(meta.entityId)).refresh();
		await getMapBuildingsData().refresh();
	}
	return result;
});

// export const approveBuilding
