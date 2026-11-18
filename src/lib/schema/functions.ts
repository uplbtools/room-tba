import * as v from 'valibot';
import { PLACE_CATEGORIES } from '#lib/constants/content/categories/place.js';

/**
 * Querying the list only
 */
export const ListQuerySchema = v.pipe(
	v.optional(v.number()),
	v.toNumber(),
	v.integer(),
	v.minValue(0)
);

/**
 * Schema for querying entities using its id
 */
export const TableIdSchema = v.pipe(
	v.union([v.pipe(v.optional(v.string()), v.toNumber()), v.number()]),
	v.integer('You did not enter an integer!!!')
);

/**
 * When creating a form remote function for creating a schema
 */
export const ProposalMetaSchema = v.object({
	entityId: v.pipe(v.number(), v.integer()),
	baseVersion: v.number(),
	// patch is a record,
	submitterName: v.pipe(v.string(), v.trim(), v.nonEmpty('Submitter name is empty'))
});

/**
 * ===========================================================
 * PROPOSAL SCHEMA PER entity
 * ===========================================================
 */

export const BuildingProposalSchema = v.object({
	meta: ProposalMetaSchema,
	body: v.object({
		buildingName: v.pipe(v.string(), v.trim(), v.nonEmpty('Building name is empty')),
		directions: v.pipe(v.string(), v.trim()),
		lon: v.optional(v.number()),
		lat: v.optional(v.number()),
		buildingType: v.optional(v.union([v.literal('non-admin'), v.literal('admin')]))
	})
});

export const DormProposalSchema = v.object({
	meta: ProposalMetaSchema,
	body: v.object({
		dormName: v.pipe(v.string(), v.trim(), v.nonEmpty('Dorm name is empty')),
		description: v.pipe(v.string(), v.trim()),
		lon: v.optional(v.number()),
		lat: v.optional(v.number()),
		gender: v.optional(v.union([v.literal('Male'), v.literal('Female'), v.literal('Co-ed')])),
		capacity: v.optional(v.pipe(v.number(), v.integer()))
	})
});

export const OrgProposalSchema = v.object({
	meta: ProposalMetaSchema,
	body: v.object({
		name: v.pipe(v.string(), v.trim(), v.nonEmpty('Name is empty')),
		category: v.optional(v.pipe(v.string(), v.maxLength(24))),
		lon: v.optional(v.number()),
		lat: v.optional(v.number()),
		description: v.pipe(v.string(), v.trim())
	})
});

export const PlaceProposalSchema = v.object({
	meta: ProposalMetaSchema,
	body: v.object({
		name: v.pipe(v.string(), v.trim(), v.nonEmpty('Name is empty')),
		category: v.optional(v.pipe(v.string(), v.maxLength(24))),
		lon: v.optional(v.number()),
		lat: v.optional(v.number()),
		description: v.pipe(v.string(), v.trim())
	})
});

export const PlaceCreateSchema = v.object({
	meta: v.pick(ProposalMetaSchema, ['submitterName']),
	body: v.object({
		name: v.pipe(v.string(), v.trim(), v.nonEmpty('Name is empty'), v.maxLength(100)),
		category: v.picklist(PLACE_CATEGORIES, 'Pick a category'),
		description: v.pipe(v.string(), v.trim()),
		lat: v.number('Tap the map to place the pin'),
		lon: v.number('Tap the map to place the pin')
	})
});

export const CollegeProposalSchema = v.object({
	meta: ProposalMetaSchema,
	body: v.object({
		collegeName: v.pipe(v.string(), v.trim(), v.nonEmpty('Name is empty'), v.maxLength(100))
	})
});

export const DivisionProposalSchema = v.object({
	meta: ProposalMetaSchema,
	body: v.object({
		divisionName: v.pipe(v.string(), v.trim(), v.nonEmpty('Name is empty'), v.maxLength(100))
	})
});

export const RoomProposalSchema = v.object({
	meta: ProposalMetaSchema,
	body: v.object({
		fullName: v.optional(v.string()),
		directions: v.optional(v.pipe(v.string(), v.trim())),
		buildingId: v.optional(v.pipe(v.number(), v.integer())),
		collegeId: v.optional(v.pipe(v.number(), v.integer())),
		divisionId: v.optional(v.pipe(v.number(), v.integer())),
		category: v.optional(v.pipe(v.string(), v.maxLength(24)))
	})
});

export const EventProposalSchema = v.object({
	meta: ProposalMetaSchema,
	body: v.object({
		title: v.pipe(v.string(), v.trim(), v.nonEmpty('Title is required'), v.maxLength(160)),
		description: v.optional(v.pipe(v.string(), v.trim()))
	})
});

const CoordinateSchema = v.object({
	lat: v.pipe(v.number(), v.minValue(-90), v.maxValue(90)),
	lon: v.pipe(v.number(), v.minValue(-180), v.maxValue(180)),
	name: v.optional(v.pipe(v.string(), v.maxLength(80)))
});

export const DirectionsPointSchema = v.union([
	CoordinateSchema,
	v.object({
		type: v.picklist(['building', 'room', 'dorm', 'organization', 'place']),
		id: TableIdSchema
	})
]);

export const DirectionsSchema = v.object({
	from: DirectionsPointSchema,
	to: DirectionsPointSchema
});

export const RoomWalkSchema = v.object({
	from: v.pipe(v.string(), v.trim(), v.minLength(1)),
	to: v.pipe(v.string(), v.trim(), v.minLength(1))
});

export const JeepReportSchema = v.object({
	routeId: v.string(),
	stopKey: v.string(),
	direction: v.nullish(v.picklist(['forward', 'reverse'])),
	deviceId: v.string(),
	full: v.optional(v.boolean()),
	lat: v.optional(v.number()),
	lon: v.optional(v.number())
});

export const RoomCodesSchema = v.pipe(
	v.array(v.pipe(v.string(), v.trim(), v.minLength(1))),
	v.maxLength(200)
);
