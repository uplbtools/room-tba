import { form } from '$app/server';
import { DivisionProposalSchema } from '#lib/schema/functions.js';
import { editProposalsTable } from '#lib/server/db/schema.js';
import { db } from '#lib/utils/db.js';
import { error } from '@sveltejs/kit';

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
