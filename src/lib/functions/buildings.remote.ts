import { form, query } from '$app/server';
import { db } from '#lib/utils/db.js';
import { buildingsTable, editProposalsTable } from '#lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import { BuildingProposalSchema, TableIdSchema } from '#lib/schema/functions.js';

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
	const [entry] = await db.select().from(buildingsTable).where(eq(buildingsTable.id, id));

	if (!entry) error(404, 'Not found');
	return entry;
});

export const addBuildingSuggestion = form(
	BuildingProposalSchema,
	async ({ meta, body: proposedPatch }) => {
		try {
			await db.insert(editProposalsTable).values({
				entityType: 'create_building',
				entityId: meta.entityId,
				baseVersion: meta.baseVersion,
				submitterName: meta.submitterName,
				proposedPatch
			});
		} catch {
			error(500, {
				message: 'SERVER ERROR: Cannot add building suggestion'
			});
		}
	}
);
