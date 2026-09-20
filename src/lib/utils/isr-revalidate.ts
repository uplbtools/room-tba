/**
 * On-demand ISR revalidation for Vercel (x-prerender-revalidate).
 *
 * Requires ISR_BYPASS_TOKEN in Vercel env and matching bypassToken in astro.config.
 * No-op when the token is unset (local dev, previews without ISR configured).
 */

import {
	getBuildingCanonicalPath,
	getCollegeCanonicalPath,
	getDivisionCanonicalPath,
	getDormCanonicalPath,
	getEventCanonicalPath,
	getOrganizationCanonicalPath,
	getOrganizationIndexPath,
	getPlaceCanonicalPath,
	getPlaceIndexPath,
	getRoomCanonicalPath
} from '$lib/utils/entity/entity-urls';
import { SITE_URL } from '$lib/utils/site';
import type {
	Building,
	College,
	Division,
	DormData,
	OrgData,
	PlaceData,
	Room
} from '$lib/utils/types';

const SITEMAP_PATH = '/sitemap.xml';

// The revalidated path is the canonical entity URL, so these delegate rather
// than rebuilding it — a URL change stays in one place.
export function roomIsrPath(room: Pick<Room, 'id' | 'code'>): string {
	return getRoomCanonicalPath(room);
}

export function buildingIsrPath(building: Pick<Building, 'buildingName'>): string {
	return getBuildingCanonicalPath(building.buildingName);
}

export function collegeIsrPath(college: Pick<College, 'collegeName'>): string {
	return getCollegeCanonicalPath(college.collegeName);
}

export function divisionIsrPath(division: Pick<Division, 'divisionName'>): string {
	return getDivisionCanonicalPath(division.divisionName);
}

export function dormIsrPath(dorm: Pick<DormData, 'id' | 'dormName'>): string {
	return getDormCanonicalPath(dorm);
}

export function eventIsrPath(slug: string): string {
	return getEventCanonicalPath(slug);
}

// Organizations and places each span two segments, so a mutation has to
// revalidate the entity page and the index it is listed on — which index that
// is follows from the row's own category.
export function organizationIsrPaths(
	organization: Pick<OrgData, 'id' | 'name'> & Partial<Pick<OrgData, 'category'>>
): string[] {
	return [getOrganizationCanonicalPath(organization), getOrganizationIndexPath(organization)];
}

export function placeIsrPaths(place: Pick<PlaceData, 'id' | 'name' | 'category'>): string[] {
	return [getPlaceCanonicalPath(place), getPlaceIndexPath(place)];
}

/** Fire-and-forget ISR revalidation; always includes sitemap when paths are provided. */
export function revalidateIsrPaths(paths: string[] | undefined): void {
	if (!paths?.length) return;

	const token = process.env.ISR_BYPASS_TOKEN?.trim();
	if (!token) return;

	const unique = [...new Set([...paths, SITEMAP_PATH])];
	const base = SITE_URL.replace(/\/$/, '');

	void Promise.allSettled(
		unique.map((path) =>
			fetch(`${base}${path}`, {
				method: 'HEAD',
				headers: { 'x-prerender-revalidate': token }
			})
		)
	);
}
