import { error } from '@sveltejs/kit';
import type { EntityIndexItem, SeoData } from '#lib/components/seo/seo-data.js';
import {
	isPlaceLandmark,
	placeCategoryLabel,
	placeDirectoryLabel
} from '#lib/constants/content/categories/place.js';
import {
	entityIndexPath,
	getPlaceCanonicalPath,
	parseRouteSlug
} from '#lib/utils/entity/entity-urls.js';
import { getAllPlaces } from '#lib/services/entity/map-data.js';
import { getPlacePageData } from '#lib/services/page-data/entity.js';
import {
	absoluteUrl,
	breadcrumbSchema,
	jsonLd,
	ogCardPath,
	ogImageUrl,
	webpageSchema
} from '#lib/utils/site.js';

/** PlaceEntityPage.astro, shared by /establishment/[slug] and /landmark/[slug]. */
export async function loadPlacePage(slug: string) {
	const placeId = parseRouteSlug(slug).id;
	if (!placeId) error(404, 'Not Found');

	const place = await getPlacePageData(placeId);
	if (!place) error(404, 'Not Found');

	const category = placeCategoryLabel(place.category) ?? 'Campus place';
	const canonicalPath = getPlaceCanonicalPath(place);
	const title = `${place.name} | ${category} at UPLB | Room TBA`;
	const description = place.description
		? `${place.name} is listed as a ${category.toLowerCase()} at UPLB. ${place.description}`
		: `Find ${place.name}, a ${category.toLowerCase()} at UPLB, on the Room TBA campus map.`;

	const seo: SeoData = {
		title,
		description,
		canonicalPath,
		imagePath: ogCardPath({
			title: place.name,
			subtitle: place.hours ? `UPLB Los Baños · ${place.hours}` : 'UPLB Los Baños',
			kicker: `${category} at UPLB`
		}),
		structuredData: jsonLd(
			webpageSchema({ title, description, path: canonicalPath }),
			breadcrumbSchema([
				{ name: 'Home', path: '/' },
				{ name: category, path: canonicalPath },
				{ name: place.name, path: canonicalPath }
			]),
			{
				'@context': 'https://schema.org',
				'@type': 'Place',
				name: place.name,
				description,
				url: absoluteUrl(canonicalPath),
				image: ogImageUrl(place.imageUrl ?? undefined),
				geo:
					place.lat !== null && place.lon !== null
						? { '@type': 'GeoCoordinates', latitude: place.lat, longitude: place.lon }
						: undefined
			}
		)
	};

	return { seo, initialSearch: { category: 'place' as const, value: place.name } };
}

type PlaceSegment = 'landmarks' | 'establishments';

const PLACE_INDEX_COPY = {
	landmarks: {
		kind: 'Landmarks',
		title: 'UPLB landmarks and tourist spots | Room TBA',
		description:
			'Browse UPLB landmarks and tourist spots on Room TBA, each pinned to its location on the campus map.',
		heading: 'UPLB landmark pages',
		intro:
			'Browse crawlable pages for landmarks and tourist spots at UPLB. Each page opens the place result view with its map pin, hours, and links.'
	},
	establishments: {
		kind: 'Establishments',
		title: 'UPLB food, services, and establishments | Room TBA',
		description:
			'Browse food spots, services, and transport points around UPLB on Room TBA, each pinned to the campus map.',
		heading: 'UPLB establishment pages',
		intro:
			'Browse crawlable pages for food spots, services, and transport points at UPLB. Each page opens the place result view with its map pin, hours, and links.'
	}
} as const satisfies Record<PlaceSegment, Record<string, string>>;

/**
 * Index for /map/landmarks/ and /map/establishments/. One narrow query against
 * the places table rather than the whole app dataset, split on the same
 * predicate `getPlaceCanonicalPath` uses so a row always lists under the
 * segment its own canonical link points at.
 */
export async function loadPlaceIndexPage(segment: PlaceSegment) {
	const places = await getAllPlaces();
	const wantLandmarks = segment === 'landmarks';
	const copy = PLACE_INDEX_COPY[segment];

	const items: EntityIndexItem[] = places
		.filter((place) => isPlaceLandmark(place.category) === wantLandmarks)
		.sort((a, b) => a.name.localeCompare(b.name))
		.map((place) => {
			const href = getPlaceCanonicalPath(place);
			return {
				href,
				label: place.name,
				description: placeDirectoryLabel(place.category) ?? undefined,
				copyUrl: absoluteUrl(href),
				copyLabel: `Copy link to ${place.name}`
			};
		});

	const canonicalPath = entityIndexPath(segment);
	const seo: SeoData = {
		title: copy.title,
		description: copy.description,
		canonicalPath,
		structuredData: jsonLd(
			webpageSchema({ title: copy.title, description: copy.description, path: canonicalPath }),
			breadcrumbSchema([
				{ name: 'Home', path: '/' },
				{ name: copy.kind, path: canonicalPath }
			])
		)
	};

	return {
		// Tells the side panel this route owns its body.
		panel: 'browse' as const,
		seo,
		items,
		heading: copy.heading,
		intro: copy.intro
	};
}
