import { form, query } from '$app/server';
import { ListQuerySchema, PlaceProposalSchema, TableIdSchema } from '#lib/schema/functions.js';
import { placesTable } from '#lib/server/db/schema.js';
import { db } from '#lib/utils/db.js';
import { error } from '@sveltejs/kit';
import { updatePlace } from '#lib/services/admin/actions.js';
import { saveEntityEdit } from '#lib/services/contribution/entity-edit.js';
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

export const getPlacesList = query(ListQuerySchema, async(offset = 0) => {
	const rows = await db
		.select()
		.from(placesTable)
		.orderBy(placesTable.name)
		.limit(8)
		.offset(8 * offset);
	return rows;
})

export const addPlaceSuggestion = form(PlaceProposalSchema, async ({ meta, body }) => {
	const [current] = await db.select().from(placesTable).where(eq(placesTable.id, meta.entityId));
	if (!current) error(404, 'Not found');
	const result = await saveEntityEdit({
		entityType: 'place',
		meta,
		body,
		current,
		publish: (patch, editedBy) => updatePlace(meta.entityId, patch, meta.baseVersion, editedBy)
	});
	if (result.published) {
		await getPlaceById(String(meta.entityId)).refresh();
		await getMapPlacesData().refresh();
	}
	return result;
});
