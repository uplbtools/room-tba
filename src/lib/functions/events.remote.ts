import { form, query } from '$app/server';
import { EventProposalSchema, TableIdSchema } from '#lib/schema/functions.js';
import { updateEvent } from '#lib/services/admin/actions.js';
import { saveEntityEdit } from '#lib/services/contribution/entity-edit.js';
import { getEventById as loadEvent } from '#lib/services/entity/event.js';
import { error } from '@sveltejs/kit';

export const getEventById = query(TableIdSchema, async (id) => {
	const event = await loadEvent(id);

	if (!event) error(404, 'Not found');

	return event;
});

export const addEventSuggestion = form(EventProposalSchema, async ({ meta, body }) => {
	const current = await loadEvent(meta.entityId);
	if (!current) error(404, 'Not found');
	const result = await saveEntityEdit({
		entityType: 'event',
		meta,
		body,
		current,
		publish: (patch, editedBy) => updateEvent(meta.entityId, patch, meta.baseVersion, editedBy)
	});
	if (result.published) await getEventById(String(meta.entityId)).refresh();
	return result;
});
