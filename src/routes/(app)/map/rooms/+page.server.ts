import type { EntityIndexItem, SeoData } from '#lib/components/seo/seo-data.js';
import { entityIndexPath, getRoomCanonicalPath } from '#lib/utils/entity/entity-urls.js';
import { getAllRooms, getClassCountsByRoomCode } from '#lib/services/entity/map-data.js';
import { getDefaultTerm } from '#lib/services/term.js';
import { breadcrumbSchema, jsonLd, webpageSchema } from '#lib/utils/site.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	// The room list is the one index that genuinely needs every room, but not
	// every class: the counts come back already grouped by room code.
	const defaultTerm = await getDefaultTerm();
	const [rooms, classCounts] = await Promise.all([
		getAllRooms(),
		getClassCountsByRoomCode(defaultTerm?.id)
	]);
	const termPhrase = defaultTerm?.label ? ` for ${defaultTerm.label}` : '';

	const items: EntityIndexItem[] = rooms
		.slice()
		.sort((a, b) => a.code.localeCompare(b.code))
		.map((room) => {
			const classCount = classCounts.get(room.code);

			return {
				href: getRoomCanonicalPath(room),
				label: room.code,
				description: room.building?.name
					? `${room.building.name} at UPLB${classCount === undefined ? '' : ` · ${classCount} classes${termPhrase}`}`
					: 'UPLB room listing'
			};
		});

	const title = 'Rooms at UPLB | Room TBA';
	const description = defaultTerm?.label
		? `Browse Room TBA room pages for UPLB. Class listings reflect ${defaultTerm.label}. Open each room for directions, building context, and schedules.`
		: 'Browse Room TBA room pages for UPLB and open each room with directions, building context, and listed classes.';

	const seo: SeoData = {
		title,
		description,
		canonicalPath: entityIndexPath('rooms'),
		structuredData: jsonLd(
			webpageSchema({ title, description, path: entityIndexPath('rooms') }),
			breadcrumbSchema([
				{ name: 'Home', path: '/' },
				{ name: 'Rooms', path: entityIndexPath('rooms') }
			])
		)
	};

	return {
		// Tells the side panel this route owns its body.
		panel: 'browse' as const,
		seo,
		items,
		heading: 'UPLB room pages',
		intro:
			'Browse crawlable room pages for Room TBA. Each page links to the live room view with directions, building details, and the classes currently associated with that room for the active schedule term.'
	};
};
