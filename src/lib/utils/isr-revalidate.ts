/**
 * On-demand ISR revalidation for Vercel (x-prerender-revalidate).
 *
 * Requires ISR_BYPASS_TOKEN in Vercel env and matching bypassToken in astro.config.
 * No-op when the token is unset (local dev, previews without ISR configured).
 */

import {
	entityIndexPath,
	getBuildingCanonicalPath,
	getCollegeCanonicalPath,
	getDivisionCanonicalPath,
	getDormCanonicalPath,
	getEventCanonicalPath,
	getOrganizationCanonicalPath,
	getPlaceCanonicalPath,
	getRoomCanonicalPath
} from '#lib/utils/entity/entity-urls.js';
import { SITE_URL } from '#lib/utils/site.js';

const SITEMAP_PATH = '/sitemap.xml';

type Row = { id: number };

export const roomIsrPath = (room: Row) => getRoomCanonicalPath(room);
export const buildingIsrPath = (building: Row) => getBuildingCanonicalPath(building);
export const collegeIsrPath = (college: Row) => getCollegeCanonicalPath(college);
export const divisionIsrPath = (division: Row) => getDivisionCanonicalPath(division);
export const dormIsrPath = (dorm: Row) => getDormCanonicalPath(dorm);
export const eventIsrPath = (event: Row) => getEventCanonicalPath(event);

export const organizationIsrPaths = (organization: Row) => [
	getOrganizationCanonicalPath(organization),
	entityIndexPath('organizations')
];

export const placeIsrPaths = (place: Row) => [
	getPlaceCanonicalPath(place),
	entityIndexPath('places')
];

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
