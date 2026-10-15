import { createEntityMergeRoute } from '#lib/admin/entity-merge-route.js';
import { mergeColleges } from '#lib/services/contribution/merge.js';

export const POST = createEntityMergeRoute({
	entityLabel: 'college',
	responseKey: 'college',
	targetIdKey: 'targetCollegeId',
	merge: mergeColleges
});
