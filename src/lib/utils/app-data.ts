// src/lib/app-data.ts

import { slugifySegment } from './site';
import type {
	Building,
	College,
	Division,
	DormData,
	EventData,
	Room
} from '$lib/utils/types';

export type SearchCategory =
	| 'building'
	| 'division'
	| 'college'
	| 'room'
	| 'dorm'
	| 'organization'
	| 'place'
	| 'event';

export type InitialSearchState = {
	category: SearchCategory;
	value: string;
	eventSlug?: string;
};

export function getRoomSlug(room: Pick<Room, 'code'>) {
	return slugifySegment(room.code);
}

export { getRoomRouteSlug } from './route/route-slugs';

export function getBuildingSlug(building: Pick<Building, 'buildingName'>) {
	return slugifySegment(building.buildingName);
}

export function getDivisionSlug(division: Pick<Division, 'divisionName'>) {
	return slugifySegment(division.divisionName);
}

export function getCollegeSlug(college: Pick<College, 'collegeName'>) {
	return slugifySegment(college.collegeName);
}

export function getDormSlug(dorm: Pick<DormData, 'dormName'>) {
	return slugifySegment(dorm.dormName);
}

export { getDormRouteSlug } from './route/route-slugs';

export function getEventSlug(event: Pick<EventData, 'slug'>) {
	return event.slug;
}
