import { createEntityMergeRoute } from '#lib/admin/entity-merge-route.js';
import { mergeDivisions } from '#lib/services/contribution/merge.js';

export const POST = createEntityMergeRoute({
	entityLabel: 'division',
	responseKey: 'division',
	targetIdKey: 'targetDivisionId',
	merge: mergeDivisions
});
