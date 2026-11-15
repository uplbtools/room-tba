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
		'/faq',
		'/changelog',
		'/privacy',
		'/terms',
		'/donate',
		'/sponsors',
		entityIndexPath('rooms'),
		entityIndexPath('buildings'),
		entityIndexPath('divisions'),
		entityIndexPath('colleges'),
		entityIndexPath('dorms'),
		entityIndexPath('events'),
		entityIndexPath('organizations'),
		entityIndexPath('units'),
		entityIndexPath('places'),
		'/map/planner',
		'/map/today',
		'/map/calendar',
		'/map/final-exams',
		...(campusTransit.enabled ? [TRANSIT_INDEX_PATH] : []),
		...rooms.map((room) => getRoomCanonicalPath(room)),
		...buildings.map((building) => getBuildingCanonicalPath(building)),
		...divisions.map((division) => getDivisionCanonicalPath(division)),
		...colleges.map((college) => getCollegeCanonicalPath(college)),
		...dorms.map((dorm) => getDormCanonicalPath(dorm)),
		...events.map((event) => getEventCanonicalPath(event)),
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
