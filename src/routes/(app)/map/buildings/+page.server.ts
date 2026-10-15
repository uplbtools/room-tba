import type { EntityIndexItem, SeoData } from '#lib/components/seo/seo-data.js';
import { entityIndexPath, getBuildingCanonicalPath } from '#lib/utils/entity/entity-urls.js';
import { getAllBuildings, getRoomCountsByParent } from '#lib/services/entity/map-data.js';
import { getDefaultTerm } from '#lib/services/term.js';
import { absoluteUrl, breadcrumbSchema, jsonLd, webpageSchema } from '#lib/utils/site.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	// Three narrow queries instead of the whole app dataset. The room total is
	// grouped in the database rather than counted by scanning every room here.
	const [buildings, roomCounts, defaultTerm] = await Promise.all([
		getAllBuildings(),
		getRoomCountsByParent('building'),
		getDefaultTerm()
	]);

	const items: EntityIndexItem[] = buildings
		.slice()
		.sort((a, b) => a.buildingName.localeCompare(b.buildingName))
		.map((building) => {
			const roomCount = roomCounts.get(building.id) ?? 0;
			const href = getBuildingCanonicalPath(building.buildingName);

			return {
				href,
				label: building.buildingName,
				description: `${roomCount} room${roomCount === 1 ? '' : 's'} listed${building.directions ? ' · includes directions' : ''}`,
				copyUrl: absoluteUrl(href),
				copyLabel: `Copy link to ${building.buildingName}`
			};
		});

	const title = 'UPLB buildings | Room TBA';
	const description = defaultTerm?.label
		? `Browse building pages on Room TBA to find UPLB rooms, map context, and class schedules for ${defaultTerm.label}.`
		: 'Browse building pages on Room TBA to find UPLB rooms, map context, and available building directions.';

	const seo: SeoData = {
		title,
		description,
		canonicalPath: entityIndexPath('buildings'),
		structuredData: jsonLd(
			webpageSchema({ title, description, path: entityIndexPath('buildings') }),
			breadcrumbSchema([
				{ name: 'Home', path: '/' },
				{ name: 'Buildings', path: entityIndexPath('buildings') }
			])
		)
	};

	return {
		// Tells the side panel this route owns its body.
		panel: 'browse' as const,
		seo,
		items,
		heading: 'UPLB building pages',
		intro:
			'Browse crawlable building pages for Room TBA. Each page opens the building result view and lists the rooms mapped to that building.'
	};
};
