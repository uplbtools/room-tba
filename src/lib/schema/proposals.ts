import * as v from 'valibot';
import type { ProposalCreateType } from '$lib/services/contribution/proposal-action';
import { ORG_CATEGORIES } from '$lib/constants/content/categories/org';
import { normalizePlaceCategory } from '$lib/constants/content/categories/place';

export class ProposalValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ProposalValidationError';
	}
}

/** Trimmed string that must not be empty. Non-strings fail with the same message. */
const requiredText = (message: string) =>
	v.pipe(v.string(message), v.trim(), v.nonEmpty(message));

/** Trimmed string, defaulting to '' when missing or not a string. */
const optionalText = v.fallback(v.pipe(v.string(), v.trim()), '');

const coordinate = (message: string) => v.pipe(v.number(message), v.finite(message));

const BundledRoom = v.object({
	roomCode: optionalText,
	directions: optionalText,
	photoUrls: v.fallback(
		v.pipe(
			v.array(v.unknown()),
			v.transform((urls) => urls.filter((url): url is string => typeof url === 'string'))
		),
		[]
	)
});

export type BundledRoomDraft = v.InferOutput<typeof BundledRoom>;

/** Lenient: drops malformed entries and rooms without a code. */
const BundledRooms = v.fallback(
	v.pipe(
		v.array(v.unknown()),
		v.transform((entries) =>
			entries.flatMap((entry) => {
				const room = v.safeParse(BundledRoom, entry);
				return room.success && room.output.roomCode ? [room.output] : [];
			})
		)
	),
	[]
);

export function parseBundledRooms(patch: Record<string, unknown>): BundledRoomDraft[] {
	return v.parse(BundledRooms, patch.rooms);
}

const maxRooms = (max: number) =>
	v.maxLength<BundledRoomDraft[], number, string>(max, `Add at most ${max} rooms in one building suggestion.`);

const uniqueRoomCodes = v.check(
	(rooms: BundledRoomDraft[]) => new Set(rooms.map((room) => room.roomCode.toLowerCase())).size === rooms.length,
	(issue) => {
		const seen = new Set<string>();
		const dupe = issue.input.find((room) => {
			const key = room.roomCode.toLowerCase();
			return seen.has(key) || !seen.add(key);
		});
		return `Duplicate room code in this suggestion: ${dupe?.roomCode}`;
	}
);

function assertValid<T extends v.GenericSchema>(schema: T, input: unknown): void {
	const result = v.safeParse(schema, input, { abortEarly: true });
	if (!result.success) throw new ProposalValidationError(result.issues[0].message);
}

export function validateBundledRooms(rooms: BundledRoomDraft[], max = 20): void {
	assertValid(v.pipe(v.array(BundledRoom), maxRooms(max), uniqueRoomCodes), rooms);
}

type PatchSchema = v.ObjectSchema<v.ObjectEntries, undefined>;

const CREATE_PROPOSAL_SCHEMAS: Record<ProposalCreateType, PatchSchema> = {
	create_building: v.object({
		buildingName: requiredText('Building name is required.'),
		lat: v.number('Pick a map location for the new building.'),
		lon: v.number('Pick a map location for the new building.'),
		rooms: v.pipe(BundledRooms, maxRooms(20), uniqueRoomCodes)
	}),
	create_event: v.object({
		title: requiredText('Event title is required.'),
		startsAt: v.string('Event start and end are required.'),
		endsAt: v.string('Event start and end are required.')
	}),
	create_dorm: v.object({
		dormName: requiredText('Dorm name is required.'),
		gender: requiredText('Dorm gender is required.')
	}),
	create_place: v.object({
		name: requiredText('Place name is required.'),
		category: v.custom((value) => normalizePlaceCategory(value) !== null, 'Pick a valid place category.'),
		lat: v.number('Pick a map location for the new place.'),
		lon: v.number('Pick a map location for the new place.')
	}),
	create_room: v.object({
		roomCode: requiredText('Room code is required.'),
		buildingId: v.pipe(
			v.unknown(),
			v.transform(Number),
			v.number(),
			v.integer('Pick the building this room belongs to.'),
			v.minValue(1, 'Pick the building this room belongs to.')
		)
	}),
	create_college: v.object({
		collegeName: requiredText('College name is required.')
	}),
	create_division: v.object({
		divisionName: requiredText('Division name is required.')
	}),
	create_organization: v.object({
		name: requiredText('Organization name is required.'),
		category: v.pipe(
			v.string('Pick a valid organization category.'),
			v.trim(),
			v.picklist(ORG_CATEGORIES, 'Pick a valid organization category.')
		),
		lat: v.number('Pick a map location for the new organization.'),
		lon: v.number('Pick a map location for the new organization.')
	}),
	create_jeepney_stop: v.object({
		routeId: requiredText('Route, stop name, and description are required.'),
		name: requiredText('Route, stop name, and description are required.'),
		description: requiredText('Route, stop name, and description are required.'),
		lat: coordinate('Pick a valid stop location.'),
		lon: coordinate('Pick a valid stop location.')
	})
};

export function validateCreateProposalPatch(
	entityType: ProposalCreateType,
	patch: Record<string, unknown>
): void {
	const schema = CREATE_PROPOSAL_SCHEMAS[entityType];
	// valibot reports a missing key with a generic "Invalid key" message, so
	// give every field an explicit undefined and let its own message win.
	const blanks = Object.fromEntries(Object.keys(schema.entries).map((key) => [key, undefined]));
	assertValid(schema, { ...blanks, ...patch });
}
