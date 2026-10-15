import { getDormRouteSlug } from '#lib/utils/app-data.js';
import type { EntityIndexItem, SeoData } from '#lib/components/seo/seo-data.js';
import { entityIndexPath, getDormCanonicalPath } from '#lib/utils/entity/entity-urls.js';
import { getAllDorms } from '#lib/services/entity/map-data.js';
import { breadcrumbSchema, jsonLd, webpageSchema } from '#lib/utils/site.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const dorms = await getAllDorms();

	const items: EntityIndexItem[] = dorms
		.slice()
		.sort((a, b) => a.dormName.localeCompare(b.dormName))
		.map((dorm) => ({
			href: getDormCanonicalPath(dorm),
			label: dorm.dormName,
			description: [
				dorm.isUpManaged ? 'UP-managed dorm' : 'Private dorm',
				dorm.shortName ? `short name: ${dorm.shortName}` : null,
				dorm.priceRange
			]
				.filter((value): value is string => Boolean(value))
				.join(' · ')
		}));

	const title = 'Dorms at UPLB | Room TBA';
	const description =
		'Browse Room TBA dorm pages for UPLB and open each dorm with map context, contacts, and available housing details.';

	const seo: SeoData = {
		title,
		description,
		canonicalPath: entityIndexPath('dorms'),
		structuredData: jsonLd(
			webpageSchema({ title, description, path: entityIndexPath('dorms') }),
			breadcrumbSchema([
				{ name: 'Home', path: '/' },
				{ name: 'Dorms', path: entityIndexPath('dorms') }
			])
		)
	};

	return {
		// Tells the side panel this route owns its body.
		panel: 'browse' as const,
		seo,
		items,
		heading: 'UPLB dorm pages',
		intro:
			'Browse crawlable dorm pages for Room TBA. Each page links to the live dorm view with map context, contacts, amenities, and housing details when available.'
	};
};
