import { form, query } from '$app/server';
import { CollegeProposalSchema, TableIdSchema } from '#lib/schema/functions.js';
import { getCollegeById as loadCollege, updateCollege } from '#lib/services/admin/actions.js';
import { saveEntityEdit } from '#lib/services/contribution/entity-edit.js';
import { error } from '@sveltejs/kit';

/** One college by id. */
export const getCollegeById = query(TableIdSchema, async (id) => {
	const college = await loadCollege(id);
	if (!college) error(404, 'Not found');
	return college;
});

/** Editors publish a college edit. Everyone else files it as a proposal for review. */
export const addCollegeSuggestion = form(CollegeProposalSchema, async ({ meta, body }) => {
	const current = await loadCollege(meta.entityId);
	if (!current) error(404, 'Not found');
	const result = await saveEntityEdit({
		entityType: 'college',
		meta,
		body,
		current,
		publish: (patch, editedBy) =>
			updateCollege(meta.entityId, String(patch.collegeName), meta.baseVersion, editedBy)
	});
	if (result.published) await getCollegeById(String(meta.entityId)).refresh();
	return result;
});
