import { isStudentOrganization } from '$lib/constants/content/categories/org';
import { isPlaceLandmark } from '$lib/constants/content/categories/place';
import type { SearchCategory } from '../app-data';
import {
	getDormRouteSlug,
	getOrganizationRouteSlug,
	getPlaceRouteSlug,
	getRoomRouteSlug
} from '../route/route-slugs';
import { slugifySegment } from '../site';
import type {
	Building,
	College,
	Division,
	DormData,
	OrgData,
	PlaceData,
	Room
} from '../types';

function getBuildingSlug(building: Pick<Building, 'buildingName'>) {
	return slugifySegment(building.buildingName);
}

function getCollegeSlug(college: Pick<College, 'collegeName'>) {
	return slugifySegment(college.collegeName);
}

function getDivisionSlug(division: Pick<Division, 'divisionName'>) {
	return slugifySegment(division.divisionName);
}

export type RoutableCategory = SearchCategory;

export type RoutableQueryState = {
	type: 'query' | 'result';
	category:
		| 'building'
		| 'division'
		| 'college'
		| 'room'
		| 'class'
		| 'dorm'
		| 'organization'
		| 'place'
		| 'event'
		| 'events'
		| 'classes'
		| 'browse'
		| null;
	value: string;
	eventSlug?: string;
};

export type ParsedEntityPath = {
	category: RoutableCategory;
	slug: string;
};

// Entity pages render inside the map, so their URLs live under it: the plural
// segment is the map's browse list for that type and the slug opens that entry.
export const MAP_BASE_PATH = '/map';

export const ENTITY_SEGMENTS = [
	'buildings',
	'colleges',
	'divisions',
	'rooms',
	'dorms',
	'organizations',
	'units',
	'landmarks',
	'establishments',
	'events'
] as const;

export type EntitySegment = (typeof ENTITY_SEGMENTS)[number];

// Several segments narrow to the same store category: units are organizations
// with a non-student category, and both landmarks and establishments are places.
const SEGMENT_CATEGORIES: Record<EntitySegment, RoutableCategory> = {
	buildings: 'building',
	colleges: 'college',
	divisions: 'division',
	rooms: 'room',
	dorms: 'dorm',
	organizations: 'organization',
	units: 'organization',
	landmarks: 'place',
	establishments: 'place',
	events: 'event'
};

const ENTITY_PATH_PATTERN = new RegExp(`^/map/(${ENTITY_SEGMENTS.join('|')})/([^/]+)/?$`);

export function entityIndexPath(segment: EntitySegment) {
	return `${MAP_BASE_PATH}/${segment}/`;
}

export function entityPath(segment: EntitySegment, slug: string) {
	return `${MAP_BASE_PATH}/${segment}/${slug}/`;
}

export function normalizePathname(pathname: string) {
	if (pathname === '/') return '/';
	const trimmed = pathname.replace(/\/+$/, '');
	return trimmed === '' ? '/' : `${trimmed}/`;
}

export function parseEntityPathname(pathname: string): ParsedEntityPath | null {
	const match = pathname.match(ENTITY_PATH_PATTERN);
	if (!match) return null;
	return {
		category: SEGMENT_CATEGORIES[match[1] as EntitySegment],
		slug: decodeURIComponent(match[2])
	};
}

export function parseRouteSlug(slug: string) {
	const match = slug.match(/^(.+)-(\d+)$/);
	if (!match) {
		return { nameSlug: slug, id: null as number | null };
	}
	return { nameSlug: match[1], id: Number(match[2]) };
}

export function getBuildingCanonicalPath(buildingName: string) {
	return entityPath('buildings', getBuildingSlug({ buildingName }));
}

export function getCollegeCanonicalPath(collegeName: string) {
	return entityPath('colleges', getCollegeSlug({ collegeName }));
}

export function getDivisionCanonicalPath(divisionName: string) {
	return entityPath('divisions', getDivisionSlug({ divisionName }));
}

export function getRoomCanonicalPath(room: Pick<Room, 'id' | 'code'>) {
	return entityPath('rooms', getRoomRouteSlug(room));
}

export function getDormCanonicalPath(dorm: Pick<DormData, 'id' | 'dormName'>) {
	return entityPath('dorms', getDormRouteSlug(dorm));
}

// Student community entities live under /map/organizations/; offices and
// academic units get /map/units/ so their links aren't mislabeled. Unit links
// under /map/organizations/ keep resolving via parseEntityPathname.
export function getOrganizationSegment(
	organization: Partial<Pick<OrgData, 'category'>>
): EntitySegment {
	return organization.category && !isStudentOrganization(organization.category)
		? 'units'
		: 'organizations';
}

export function getPlaceSegment(place: Pick<PlaceData, 'category'>): EntitySegment {
	return isPlaceLandmark(place.category) ? 'landmarks' : 'establishments';
}

export function getOrganizationCanonicalPath(
	organization: Pick<OrgData, 'id' | 'name'> & Partial<Pick<OrgData, 'category'>>
) {
	return entityPath(getOrganizationSegment(organization), getOrganizationRouteSlug(organization));
}

export function getPlaceCanonicalPath(place: Pick<PlaceData, 'id' | 'name' | 'category'>) {
	return entityPath(getPlaceSegment(place), getPlaceRouteSlug(place));
}

/** Index a row is listed on — the same segment split its canonical URL uses. */
export function getOrganizationIndexPath(organization: Partial<Pick<OrgData, 'category'>>) {
	return entityIndexPath(getOrganizationSegment(organization));
}

export function getPlaceIndexPath(place: Pick<PlaceData, 'category'>) {
	return entityIndexPath(getPlaceSegment(place));
}

export function getEventCanonicalPath(slug: string) {
	return entityPath('events', slug);
}

export function getEntityCanonicalPath(
	query: Pick<RoutableQueryState, 'type' | 'category' | 'value' | 'eventSlug'>,
	context: {
		room?: Pick<Room, 'id' | 'code'> | null;
		dorm?: Pick<DormData, 'id' | 'dormName'> | null;
		organization?: Pick<OrgData, 'id' | 'name'> | null;
		place?: Pick<PlaceData, 'id' | 'name' | 'category'> | null;
	} = {}
): string | null {
	if (query.type !== 'result' || query.category === null) return null;

	switch (query.category) {
		case 'building':
			return getBuildingCanonicalPath(query.value);
		case 'college':
			return getCollegeCanonicalPath(query.value);
		case 'division':
			return getDivisionCanonicalPath(query.value);
		case 'room':
			return context.room ? getRoomCanonicalPath(context.room) : null;
		case 'dorm':
			return context.dorm ? getDormCanonicalPath(context.dorm) : null;
		case 'organization':
			return context.organization ? getOrganizationCanonicalPath(context.organization) : null;
		case 'place':
			return context.place ? getPlaceCanonicalPath(context.place) : null;
		case 'event':
			return query.eventSlug ? getEventCanonicalPath(query.eventSlug) : null;
		case 'class':
		case 'events':
		case 'browse':
			return null;
		default:
			return null;
	}
}

export function resolveQueryFromEntityPath(
	parsed: ParsedEntityPath,
	context: {
		buildings?: Building[] | null;
		colleges?: College[] | null;
		divisions?: Division[] | null;
		dorms?: DormData[] | null;
		organizations?: OrgData[] | null;
		places?: PlaceData[] | null;
	}
): RoutableQueryState | null {
	const { category, slug } = parsed;

	switch (category) {
		case 'building': {
			const building = context.buildings?.find((entry) => getBuildingSlug(entry) === slug);
			if (!building) return null;
			return {
				type: 'result',
				category: 'building',
				value: building.buildingName
			};
		}
		case 'college': {
			const college = context.colleges?.find((entry) => getCollegeSlug(entry) === slug);
			if (!college) return null;
			return {
				type: 'result',
				category: 'college',
				value: college.collegeName
			};
		}
		case 'division': {
			const division = context.divisions?.find((entry) => getDivisionSlug(entry) === slug);
			if (!division) return null;
			return {
				type: 'result',
				category: 'division',
				value: division.divisionName
			};
		}
		case 'dorm': {
			const { id } = parseRouteSlug(slug);
			const dorm =
				id === null
					? context.dorms?.find((entry) => getDormRouteSlug(entry) === slug)
					: context.dorms?.find((entry) => entry.id === id);
			if (!dorm) return null;
			return { type: 'result', category: 'dorm', value: dorm.dormName };
		}
		case 'room':
			return null;
		case 'organization': {
			const { id } = parseRouteSlug(slug);
			const organization =
				id === null
					? context.organizations?.find((entry) => getOrganizationRouteSlug(entry) === slug)
					: context.organizations?.find((entry) => entry.id === id);
			if (!organization) return null;
			return {
				type: 'result',
				category: 'organization',
				value: organization.name
			};
		}
		case 'place': {
			const { id } = parseRouteSlug(slug);
			const place =
				id === null
					? context.places?.find((entry) => getPlaceRouteSlug(entry) === slug)
					: context.places?.find((entry) => entry.id === id);
			if (!place) return null;
			return { type: 'result', category: 'place', value: place.name };
		}
		case 'event':
			return {
				type: 'result',
				category: 'event',
				value: slug,
				eventSlug: slug
			};
		default:
			return null;
	}
}
