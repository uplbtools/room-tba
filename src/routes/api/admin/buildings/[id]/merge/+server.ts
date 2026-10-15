import { createEntityMergeRoute } from '#lib/admin/entity-merge-route.js';
import { mergeBuildings } from '#lib/services/contribution/merge.js';

export const POST = createEntityMergeRoute({
	entityLabel: 'building',
	responseKey: 'building',
	targetIdKey: 'targetBuildingId',
	merge: mergeBuildings
});
