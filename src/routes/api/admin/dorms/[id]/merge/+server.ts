import { createEntityMergeRoute } from '#lib/admin/entity-merge-route.js';
import { mergeDorms } from '#lib/services/contribution/merge.js';

export const POST = createEntityMergeRoute({
	entityLabel: 'dorm',
	responseKey: 'dorm',
	targetIdKey: 'targetDormId',
	merge: mergeDorms
});
