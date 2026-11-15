import type { SearchCategory } from '../app-data';
import type { Building, College, Division, DormData, OrgData, PlaceData, Room } from '../types';

export type RoutableCategory = SearchCategory;

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
	'places',
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
	places: 'place',
	events: 'event'
};

const ENTITY_PATH_PATTERN = new RegExp(`^/map/(${ENTITY_SEGMENTS.join('|')})/([^/]+)/?$`);

export function entityIndexPath(segment: EntitySegment) {
	return `${MAP_BASE_PATH}/${segment}`;
}

export function entityPath(segment: EntitySegment, id: number | string) {
	return `${MAP_BASE_PATH}/${segment}/${id}`;
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

export function getBuildingCanonicalPath(building: Pick<Building, 'id'>) {
	return entityPath('buildings', building.id);
}

export function getCollegeCanonicalPath(college: Pick<College, 'id'>) {
	return entityPath('colleges', college.id);
}

export function getDivisionCanonicalPath(division: Pick<Division, 'id'>) {
	return entityPath('divisions', division.id);
}

export function getRoomCanonicalPath(room: Pick<Room, 'id'>) {
	return entityPath('rooms', room.id);
}

export function getDormCanonicalPath(dorm: Pick<DormData, 'id'>) {
	return entityPath('dorms', dorm.id);
}

export function getOrganizationCanonicalPath(organization: Pick<OrgData, 'id'>) {
	return entityPath('organizations', organization.id);
}

export function getPlaceCanonicalPath(place: Pick<PlaceData, 'id'>) {
	return entityPath('places', place.id);
}

export function getEventCanonicalPath(event: { id: number }) {
	return entityPath('events', event.id);
}
