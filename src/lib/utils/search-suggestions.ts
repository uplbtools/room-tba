import type { QueryStoreState } from '$lib/stores/store-types';
import type { Building, DormData, EventData, OrgData, PlaceData } from './types';

type Suggestion = {
	value: string;
	entityId?: number;
	category: Exclude<QueryStoreState['category'], null>;
	eventSlug?: string;
	building?: Building;
	event?: EventData;
};

const MAX_SUGGESTIONS = 8;
const MAX_PER_CATEGORY = 4;

function takeMatches<T>(
	items: T[],
	predicate: (item: T) => boolean,
	map: (item: T) => Suggestion
): Suggestion[] {
	const out: Suggestion[] = [];
	for (const item of items) {
		if (!predicate(item)) continue;
		out.push(map(item));
		if (out.length >= MAX_PER_CATEGORY) break;
	}
	return out;
}

export function buildEntitySuggestions(
	searchString: string,
	data: {
		loaded: boolean;
		filteredBuildings: Building[];
		filteredDorms: DormData[];
		colleges: { collegeName: string }[];
		divisions: { divisionName: string }[];
		events: EventData[];
		organizations: OrgData[];
		places: PlaceData[];
	}
): Suggestion[] {
	const needle = searchString.trim().toLowerCase();
	if (needle === '' || !data.loaded) return [];

	const suggestions = [
		...takeMatches(
			data.filteredBuildings,
			({ buildingName }) => buildingName.toLowerCase().includes(needle),
			(b) => ({ value: b.buildingName, category: 'building', building: b })
		),
		...takeMatches(
			data.colleges,
			({ collegeName }) => collegeName.toLowerCase().includes(needle),
			({ collegeName }) => ({ value: collegeName, category: 'college' })
		),
		...takeMatches(
			data.divisions,
			({ divisionName }) => divisionName.toLowerCase().includes(needle),
			({ divisionName }) => ({ value: divisionName, category: 'division' })
		),
		...takeMatches(
			data.filteredDorms,
			({ dormName, shortName }) =>
				dormName.toLowerCase().includes(needle) ||
				Boolean(shortName?.toLowerCase().includes(needle)),
			({ dormName, id }) => ({
				value: dormName,
				category: 'dorm',
				entityId: id
			})
		),
		...takeMatches(
			data.events,
			({ title, description }) =>
				title.toLowerCase().includes(needle) ||
				Boolean(description?.toLowerCase().includes(needle)),
			(e) => ({
				value: e.title,
				category: 'event',
				eventSlug: e.slug,
				event: e
			})
		),
		...takeMatches(
			data.organizations,
			({ name, description }) =>
				name.toLowerCase().includes(needle) || Boolean(description?.toLowerCase().includes(needle)),
			({ name, id }) => ({
				value: name,
				category: 'organization',
				entityId: id
			})
		),
		...takeMatches(
			data.places,
			({ name, description }) =>
				name.toLowerCase().includes(needle) || Boolean(description?.toLowerCase().includes(needle)),
			({ name, id }) => ({ value: name, category: 'place', entityId: id })
		)
	];

	return suggestions
		.sort(({ value: a }, { value: b }) => a.toLowerCase().localeCompare(b.toLowerCase()))
		.slice(0, MAX_SUGGESTIONS);
}
