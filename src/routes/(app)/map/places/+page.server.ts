import type { EntityIndexItem, SeoData } from '#lib/components/seo/seo-data.js';
import { placeDirectoryLabel } from '#lib/constants/content/categories/place.js';
import { getPlaceCanonicalPath } from '#lib/utils/entity/entity-urls.js';
import { getAllPlaces } from '#lib/services/entity/map-data.js';
import { breadcrumbSchema, jsonLd, webpageSchema } from '#lib/utils/site.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	// One narrow query against the places table instead of the whole app
	// dataset. `places` is not an ENTITY_SEGMENTS member: every row here also
	// appears under its canonical /map/landmarks/ or /map/establishments/ index,
	// so this combined view is noindex and stays out of the sitemap. It exists
	// for in-app browsing, where the landmark/establishment split is not a
	// distinction users navigate by.
	const places = await getAllPlaces();

	const items: EntityIndexItem[] = places
		.slice()
		.sort((a, b) => a.name.localeCompare(b.name))
		.map((place) => ({
			href: getPlaceCanonicalPath(place),
			label: place.name,
			description: placeDirectoryLabel(place.category) ?? undefined
		}));

	const title = 'Places at UPLB | Room TBA';
	const description =
		'Browse every mapped place at UPLB on Room TBA — landmarks, food spots, services, and transport points in one list.';
	const canonicalPath = '/map/places/';

	const seo: SeoData = {
		title,
		description,
		canonicalPath,
		robots: 'noindex, follow',
		structuredData: jsonLd(
			webpageSchema({ title, description, path: canonicalPath }),
			breadcrumbSchema([
				{ name: 'Home', path: '/' },
				{ name: 'Places', path: canonicalPath }
			])
		)
	};

	return {
		// Tells the side panel this route owns its body.
		panel: 'browse' as const,
		seo,
		items,
		heading: 'UPLB places',
		intro: 'Every mapped place at UPLB — landmarks, food, services, and transport points.'
	};
};
