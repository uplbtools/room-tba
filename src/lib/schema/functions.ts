import * as v from 'valibot';

/**
 * Querying Rooms with pagination (ID-based)
 */
export const QueryPaginationSchema = v.object({
	id: v.pipe(v.number(), v.integer()),
	offset: v.pipe(v.optional(v.number()), v.toNumber(), v.integer(), v.minValue(0))
});

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
	submitterName: v.string(),
	proposalId: v.number(),
	proposalToken: v.number()
});

/**
 * ===========================================================
 * PROPOSAL SCHEMA PER entity
 * ===========================================================
 */

export const BuildingProposalSchema = v.object({
	meta: ProposalMetaSchema,
	body: v.object({
		buildingName: v.string(),
		directions: v.string(),
		lon: v.optional(v.number()),
		lat: v.optional(v.number()),
		buildingType: v.optional(v.union([v.literal('non-admin'), v.literal('admin')]))
	})
});

export const DormProposalSchema = v.object({
	meta: ProposalMetaSchema,
	body: v.object({
		dormName: v.string(),
		directions: v.string(),
		lon: v.optional(v.number()),
		lat: v.optional(v.number()),
		gender: v.optional(v.union([v.literal('Male'), v.literal('Female'), v.literal('Co-ed')])),
		capacity: v.optional(v.pipe(v.number(), v.integer()))
	})
});

export const OrgProposalSchema = v.object({
	meta: ProposalMetaSchema,
	body: v.object({
		name: v.string(),
		category: v.pipe(v.string(), v.maxLength(24)),
		lon: v.optional(v.number()),
		lat: v.optional(v.number()),
		description: v.string()
	})
});

export const PlaceProposalSchema = v.object({
	meta: ProposalMetaSchema,
	body: v.object({
		name: v.string(),
		category: v.pipe(v.string(), v.maxLength(24)),
		lon: v.optional(v.number()),
		lat: v.optional(v.number()),
		description: v.string()
	})
});

export const CollegeProposalSchema = v.object({
	meta: ProposalMetaSchema,
	body: v.object({
		collegeName: v.string()
	})
});

export const DivisionProposalSchema = v.object({
	meta: ProposalMetaSchema,
	body: v.object({
		divisionName: v.string()
	})
});

export const RoomProposalSchema = v.object({
	meta: ProposalMetaSchema,
	body: v.object({
		fullName: v.optional(v.string()),
		directions: v.optional(v.string()),
		buildingId: v.optional(v.pipe(v.number(), v.integer())),
		collegeId: v.optional(v.pipe(v.number(), v.integer())),
		divisionId: v.optional(v.pipe(v.number(), v.integer())),
		category: v.optional(v.pipe(v.string(), v.maxLength(24)))
	})
});

export const EventProposalSchema = v.object({
	meta: ProposalMetaSchema,
	body: v.object({
		title: v.pipe(v.string(), v.maxLength(160)),
		category: v.union([
			v.literal('tradition'),
			v.literal('fair'),
			v.literal('ceremony'),
			v.literal('sports'),
			v.literal('other')
		]),
		startsAt: v.pipe(v.string(), v.isoTimestamp()),
		endsAt: v.pipe(v.string(), v.isoTimestamp())
	})
});
