import * as v from 'valibot';

// Missing params default to '' so they fail with the field's own message.
export const EntityAttributionQuery = v.object({
	entityType: v.pipe(
		v.optional(v.string(), ''),
		v.picklist(['building', 'room', 'dorm', 'college', 'division', 'event'], 'Unsupported entity type.')
	),
	entityId: v.pipe(
		v.optional(v.string(), ''),
		v.toNumber('Invalid entity ID.'),
		v.integer('Invalid entity ID.'),
		v.minValue(1, 'Invalid entity ID.')
	)
});
