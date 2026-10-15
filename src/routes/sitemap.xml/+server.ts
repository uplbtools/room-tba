import { getEventSlug } from '#lib/utils/app-data.js';
import { campusTransit } from '#lib/campus.config.js';
import { JEEPNEY_ROUTES } from '#lib/constants/map/jeepney-routes.js';
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
import {
	getAllBuildings,
	getAllColleges,
	getAllDivisions,
	getAllDorms,
	getAllOrganizations,
	getAllPlaces,
	getAllRooms
} from '#lib/services/entity/map-data.js';
import { getSeoEvents } from '#lib/services/entity/event.js';
import { absoluteUrl } from '#lib/utils/site.js';
import {
	getTransitRoutePath,
	getTransitStopPath,
	TRANSIT_INDEX_PATH
} from '#lib/utils/transit-urls.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	// Only the entity tables the sitemap lists. The old loadAppData() call also
	// pulled every class for the default term and built a room-to-class map,
	// none of which a URL list needs.
	const [rooms, buildings, divisions, colleges, dorms, events, organizations, places] =
		await Promise.all([
			getAllRooms(),
			getAllBuildings(),
			getAllDivisions(),
			getAllColleges(),
			getAllDorms(),
			getSeoEvents(),
			getAllOrganizations(),
			getAllPlaces()
		]);

	const urls = [
		'/',
		'/changelog',
		'/faq',
		'/privacy',
		'/terms',
		'/wiki',
		'/wiki/section-times',
		entityIndexPath('rooms'),
		entityIndexPath('buildings'),
		entityIndexPath('divisions'),
		entityIndexPath('colleges'),
		entityIndexPath('dorms'),
		entityIndexPath('events'),
		entityIndexPath('organizations'),
		entityIndexPath('units'),
		entityIndexPath('landmarks'),
		entityIndexPath('establishments'),
		...(campusTransit.enabled ? [TRANSIT_INDEX_PATH] : []),
		...rooms.map((room) => getRoomCanonicalPath(room)),
		...buildings.map((building) => getBuildingCanonicalPath(building.buildingName)),
		...divisions.map((division) => getDivisionCanonicalPath(division.divisionName)),
		...colleges.map((college) => getCollegeCanonicalPath(college.collegeName)),
		...dorms.map((dorm) => getDormCanonicalPath(dorm)),
		...events.map((event) => getEventCanonicalPath(getEventSlug(event))),
		// Each helper picks the canonical segment from the row's own category
		// (organizations/units, landmarks/establishments), so the sitemap lists
		// exactly the URL the in-app links point at.
		...organizations.map((organization) => getOrganizationCanonicalPath(organization)),
		...places.map((place) => getPlaceCanonicalPath(place)),
		...(campusTransit.enabled
			? JEEPNEY_ROUTES.flatMap((route) => [
					getTransitRoutePath(route.id),
					...route.stops.map((_, index) => getTransitStopPath(route.id, index))
				])
			: [])
	];

	const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url><loc>${absoluteUrl(url)}</loc></url>`).join('\n')}
</urlset>`;

	return new Response(body, {
		headers: { 'Content-Type': 'application/xml; charset=utf-8' }
	});
};
