import type { EntityIndexItem, SeoData } from '#lib/components/seo/seo-data.js';
import { entityIndexPath, getDivisionCanonicalPath } from '#lib/utils/entity/entity-urls.js';
import { getAllDivisions, getRoomCountsByParent } from '#lib/services/entity/map-data.js';
import { breadcrumbSchema, jsonLd, webpageSchema } from '#lib/utils/site.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	// Two narrow queries instead of the whole app dataset: the list needs names
	// and a room total, and the database can group the totals itself.
	const [divisions, roomCounts] = await Promise.all([
		getAllDivisions(),
		getRoomCountsByParent('division')
	]);

	const items: EntityIndexItem[] = divisions
		.slice()
		.sort((a, b) => a.divisionName.localeCompare(b.divisionName))
		.map((division) => {
			const roomCount = roomCounts.get(division.id) ?? 0;

			return {
				href: getDivisionCanonicalPath(division.divisionName),
				label: division.divisionName,
				description: `${roomCount} room${roomCount === 1 ? '' : 's'} connected to this division`
			};
		});

	const title = 'UPLB divisions | Room TBA';
	const description =
		'Browse division pages on Room TBA to find UPLB rooms associated with each division.';

	const seo: SeoData = {
		title,
		description,
		canonicalPath: entityIndexPath('divisions'),
		structuredData: jsonLd(
			webpageSchema({ title, description, path: entityIndexPath('divisions') }),
			breadcrumbSchema([
				{ name: 'Home', path: '/' },
				{ name: 'Divisions', path: entityIndexPath('divisions') }
			])
		)
	};

	return {
		// Tells the side panel this route owns its body.
		panel: 'browse' as const,
		seo,
		items,
		heading: 'UPLB division pages',
		intro:
			'Browse crawlable division pages for Room TBA. Each page opens the division result view and groups the rooms linked to that division.'
	};
};
