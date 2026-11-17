import { form, query } from '$app/server';
import { DivisionProposalSchema, TableIdSchema } from '#lib/schema/functions.js';
import { getDivisionById as loadDivision, updateDivision } from '#lib/services/admin/actions.js';
import { saveEntityEdit } from '#lib/services/contribution/entity-edit.js';
import { error } from '@sveltejs/kit';

/** One division by id. */
export const getDivisionById = query(TableIdSchema, async (id) => {
	const division = await loadDivision(id);
	if (!division) error(404, 'Not found');
	return division;
});

/** Editors publish a division edit. Everyone else files it as a proposal for review. */
export const addDivisionSuggestion = form(DivisionProposalSchema, async ({ meta, body }) => {
	const current = await loadDivision(meta.entityId);
	if (!current) error(404, 'Not found');
	const result = await saveEntityEdit({
		entityType: 'division',
		meta,
		body,
		current,
		publish: (patch, editedBy) => updateDivision(meta.entityId, patch, meta.baseVersion, editedBy)
	});
	if (result.published) await getDivisionById(String(meta.entityId)).refresh();
	return result;
});
