import { query } from '$app/server';
import * as v from 'valibot';
import { getPublicEntityHistory } from '#lib/services/entity/public-history.js';
import { PUBLIC_HISTORY_FIELDS } from '#lib/utils/editor/entity-attribution.js';

export const getPublicHistory = query(
	v.object({
		entityType: v.picklist(Object.keys(PUBLIC_HISTORY_FIELDS) as [string, ...string[]]),
		entityId: v.pipe(v.number(), v.integer(), v.minValue(1)),
		offset: v.pipe(v.number(), v.integer(), v.minValue(0))
	}),
	({ entityType, entityId, offset }) => getPublicEntityHistory(entityType, entityId, offset)
);
