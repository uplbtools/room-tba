import { form, query } from '$app/server';
import { DormProposalSchema, ListQuerySchema, TableIdSchema } from '#lib/schema/functions.js';
import { dormsTable } from '#lib/server/db/schema.js';
import { db } from '#lib/utils/db.js';
import { error } from '@sveltejs/kit';
import { updateDorm } from '#lib/services/admin/actions.js';
import { saveEntityEdit } from '#lib/services/contribution/entity-edit.js';
import { eq, isNotNull, or } from 'drizzle-orm';

/** Id, name and coordinates of every dorm, for the map pins. */
export const getMapDormsData = query(async () => {
	const rows = await db.select({
        id: dormsTable.id,
        name: dormsTable.dormName,
        lon: dormsTable.lon,
        lat: dormsTable.lat,
        isUpManaged: dormsTable.isUpManaged
    }).from(dormsTable).where(or(isNotNull(dormsTable.lon), isNotNull(dormsTable.lat)));

	return rows;
});

/** One dorm by id. */
export const getDormById = query(TableIdSchema, async (id) => {
	const [entry] = await db.select().from(dormsTable).where(eq(dormsTable.id, id));

	if (!entry) error(404, 'Not found');

	return entry;
});

/** One page of dorms by name, 8 per page. */
export const getDormsList = query(ListQuerySchema, async(offset = 0) => {
	const rows = await db
		.select()
		.from(dormsTable)
		.orderBy(dormsTable.dormName)
		.limit(8)
		.offset(8 * offset);
	return rows;
})

/** Editors publish a dorm edit. Everyone else files it as a proposal for review. */
export const addDormSuggestion = form(DormProposalSchema, async ({ meta, body }) => {
	const [current] = await db.select().from(dormsTable).where(eq(dormsTable.id, meta.entityId));
	if (!current) error(404, 'Not found');
	const result = await saveEntityEdit({
		entityType: 'dorm',
		meta,
		body,
		current,
		publish: (patch, editedBy) => updateDorm(meta.entityId, patch, meta.baseVersion, editedBy)
	});
	if (result.published) {
		await getDormById(String(meta.entityId)).refresh();
		await getMapDormsData().refresh();
	}
	return result;
});
