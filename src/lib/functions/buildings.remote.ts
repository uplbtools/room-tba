import { form, query } from '$app/server';
import { db } from '#lib/utils/db.js';
import { buildingsTable, editorHistoryTable, editProposalsTable, roomsTable } from '#lib/server/db/schema.js';
import { and, desc, eq, getTableColumns, sql } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import { BuildingProposalSchema, ListQuerySchema, RoomQueryPaginationSchema, TableIdSchema } from '#lib/schema/functions.js';

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

export const getBuildingsList = query(ListQuerySchema, async(offset = 0) => {
	const rows = await db
		.select()
		.from(buildingsTable)
		.orderBy(buildingsTable.buildingName)
		.limit(8)
		.offset(8 * offset);
	return rows;
})

export const addBuildingSuggestion = form(
	BuildingProposalSchema,
	async ({ meta, body: proposedPatch }) => {
		console.log({meta, proposedPatch});
		// try {
		// 	await db.insert(editProposalsTable).values({
		// 		entityType: 'create_building',
		// 		entityId: meta.entityId,
		// 		baseVersion: meta.baseVersion,
		// 		submitterName: meta.submitterName,
		// 		proposedPatch
		// 	});
		// } catch {
		// 	error(500, {
		// 		message: 'SERVER ERROR: Cannot add building suggestion'
		// 	});
		// }
	}
);

// export const approveBuilding
