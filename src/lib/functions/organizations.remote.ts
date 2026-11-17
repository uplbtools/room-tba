import { form, query } from '$app/server';
import { ListQuerySchema, OrgProposalSchema, TableIdSchema } from '#lib/schema/functions.js';
import { client } from '#lib/server/db/index.js';
import { organizationsTable } from '#lib/server/db/schema.js';
import { db } from '#lib/utils/db.js';
import { error } from '@sveltejs/kit';
import { updateOrganization } from '#lib/services/admin/actions.js';
import { saveEntityEdit } from '#lib/services/contribution/entity-edit.js';
import { eq, isNotNull, or } from 'drizzle-orm';
import { delay } from 'es-toolkit';

/** Id, name and coordinates of every organization, for the map pins. */
export const getMapOrgsData = query(async () => {
	const hasLocationRows = await db
		.select({
			name: organizationsTable.name,
			id: organizationsTable.id,
			lon: organizationsTable.lon,
			lat: organizationsTable.lat,
			category: organizationsTable.category
		})
		.from(organizationsTable)
		.where(or(isNotNull(organizationsTable.lon), isNotNull(organizationsTable.lat)));
	return hasLocationRows;
});

/** One organization by id. */
export const getOrgById = query(TableIdSchema, async (id) => {
	// const rows = await client`
	//     SELECT * FROM organizations
	//     WHERE id = ${id};
	// `

	// console.log(rows[0]);
	// if (rows.length === 0) error(404, "Not found");
	const [entry] = await db.select().from(organizationsTable).where(eq(organizationsTable.id, id));

	if (!entry) error(404, 'Not found');

	return entry;
});

/** Organizations housed in one building. */
export const getOrgsByBuildingId = query(TableIdSchema, async (id) => {
	const rows = await db
		.select()
		.from(organizationsTable)
		.where(eq(organizationsTable.buildingId, id));
	return rows;
});

/** One page of organizations by name, 8 per page. */
export const getOrgsList = query(ListQuerySchema, async(offset = 0) => {
	const rows = await db
		.select()
		.from(organizationsTable)
		.orderBy(organizationsTable.name)
		.limit(8)
		.offset(8 * offset);
	return rows;
})

/** Editors publish an organization edit. Everyone else files it as a proposal for review. */
export const addOrgSuggestion = form(OrgProposalSchema, async ({ meta, body }) => {
	const [current] = await db.select().from(organizationsTable).where(eq(organizationsTable.id, meta.entityId));
	if (!current) error(404, 'Not found');
	const result = await saveEntityEdit({
		entityType: 'organization',
		meta,
		body,
		current,
		publish: (patch, editedBy) => updateOrganization(meta.entityId, patch, meta.baseVersion, editedBy)
	});
	if (result.published) {
		await getOrgById(String(meta.entityId)).refresh();
		await getMapOrgsData().refresh();
	}
	return result;
});
