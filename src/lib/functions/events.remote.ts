import { form, query } from '$app/server';
import { DivisionProposalSchema, TableIdSchema } from '#lib/schema/functions.js';
import { getEventById as loadEvent } from '#lib/services/entity/event.js';
import { editProposalsTable } from '#lib/server/db/schema.js';
import { db } from '#lib/utils/db.js';
import { error } from '@sveltejs/kit';

export const getEventById = query(TableIdSchema, async (id) => {
	const event = await loadEvent(id);

	if (!event) error(404, 'Not found');

	return event;
});

export const addDivisionSuggestion = form(
	DivisionProposalSchema,
	async ({ meta, body: proposedPatch }) => {
		try {
			await db.insert(editProposalsTable).values({
				entityType: 'create_event',
				entityId: meta.entityId,
				baseVersion: meta.baseVersion,
				submitterName: meta.submitterName,
				proposedPatch
			});
		} catch {
			error(500, {
				message: 'SERVER ERROR: Cannot add organization suggestion'
			});
		}
	}
);
