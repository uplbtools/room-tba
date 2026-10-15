import { form, query } from '$app/server';
import { PlaceProposalSchema, TableIdSchema } from '#lib/schema/functions.js';
import { editProposalsTable, placesTable } from '#lib/server/db/schema.js';
import { db } from '#lib/utils/db.js';
import { error } from '@sveltejs/kit';
import { eq, isNotNull, or } from 'drizzle-orm';

export const getMapPlacesData = query(async () => {
	const rows = await db
		.select({
			id: placesTable.id,
			category: placesTable.category,
			name: placesTable.name,
			lon: placesTable.lon,
			lat: placesTable.lat
		})
		.from(placesTable)
		.where(or(isNotNull(placesTable.lon), isNotNull(placesTable.lat)));
	return rows;
});

export const getPlaceById = query(TableIdSchema, async (id) => {
	const [entry] = await db.select().from(placesTable).where(eq(placesTable.id, id));

	if (!entry) error(404, 'Not found');

	return entry;
});

export const addPlaceSuggestion = form(
	PlaceProposalSchema,
	async ({ meta, body: proposedPatch }) => {
		try {
			await db.insert(editProposalsTable).values({
				entityType: 'create_place',
				entityId: meta.entityId,
				baseVersion: meta.baseVersion,
				submitterName: meta.submitterName,
				proposedPatch
			});
		} catch {
			error(500, {
				message: 'SERVER ERROR: Cannot add place suggestion'
			});
		}
	}
);
