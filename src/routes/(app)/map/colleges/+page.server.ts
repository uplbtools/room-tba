import type { EntityIndexItem, SeoData } from '#lib/components/seo/seo-data.js';
import { entityIndexPath, getCollegeCanonicalPath } from '#lib/utils/entity/entity-urls.js';
import { getAllColleges, getRoomCountsByParent } from '#lib/services/entity/map-data.js';
import { breadcrumbSchema, jsonLd, webpageSchema } from '#lib/utils/site.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	// Two narrow queries instead of the whole app dataset: the list needs names
	// and a room total, and the database can group the totals itself.
	const [colleges, roomCounts] = await Promise.all([
		getAllColleges(),
		getRoomCountsByParent('college')
	]);

	const items: EntityIndexItem[] = colleges
		.slice()
		.sort((a, b) => a.collegeName.localeCompare(b.collegeName))
		.map((college) => {
			const roomCount = roomCounts.get(college.id) ?? 0;

			return {
				href: getCollegeCanonicalPath(college.collegeName),
				label: college.collegeName,
				description: `${roomCount} room${roomCount === 1 ? '' : 's'} connected to this college`
			};
		});

	const title = 'UPLB colleges | Room TBA';
	const description =
		'Browse college pages on Room TBA to find UPLB rooms associated with each college.';

	const seo: SeoData = {
		title,
		description,
		canonicalPath: entityIndexPath('colleges'),
		structuredData: jsonLd(
			webpageSchema({ title, description, path: entityIndexPath('colleges') }),
			breadcrumbSchema([
				{ name: 'Home', path: '/' },
				{ name: 'Colleges', path: entityIndexPath('colleges') }
			])
		)
	};

	return {
		// Tells the side panel this route owns its body.
		panel: 'browse' as const,
		seo,
		items,
		heading: 'UPLB college pages',
		intro:
			'Browse crawlable college pages for Room TBA. Each page opens the college result view and groups the rooms linked to that college.'
	};
};
