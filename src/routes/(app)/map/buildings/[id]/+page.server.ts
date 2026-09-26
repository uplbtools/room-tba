// import { error } from '@sveltejs/kit';
// import { getBuildingSlug } from '$lib/utils/app-data';
// import type { SeoData } from '$lib/components/seo/seo-data';
// import { entityIndexPath, getBuildingCanonicalPath } from '$lib/utils/entity/entity-urls';
// import { getBuildingPageData, resolveBuildingNameFromSlug } from '$lib/services/page-data/entity';
// import {
// 	absoluteUrl,
// 	breadcrumbSchema,
// 	jsonLd,
// 	ogCardPath,
// 	ogImageUrl,
// 	webpageSchema
// } from '$lib/utils/site';
// import type { PageServerLoad } from './$types';

// export const load: PageServerLoad = async ({ params }) => {
// 	// const buildingName = await resolveBuildingNameFromSlug(params.slug);
// 	// if (!buildingName) error(404, 'Not Found');

// 	// const appData = await getBuildingPageData(buildingName);
// 	// if (appData === null) error(404, 'Not Found');

// 	// const { building, roomCount, classCount, termLabel } = appData;
// 	// const termPhrase = termLabel ? ` for ${termLabel}` : '';
// 	// const canonicalPath = getBuildingCanonicalPath(building.buildingName);
// 	// const title = `${buildingName} | Building at UPLB | Room TBA`;
// 	// const description = `Find rooms in ${buildingName} at UPLB. Browse ${roomCount} mapped room${roomCount === 1 ? '' : 's'} and ${classCount} listed class${classCount === 1 ? '' : 'es'}${termPhrase} on Room TBA.`;

// 	// const seo: SeoData = {
// 	// 	title,
// 	// 	description,
// 	// 	canonicalPath,
// 	// 	// Every entity shares the same legible UPLB card treatment; its own photo
// 	// 	// remains available in structured data and the app surface.
// 	// 	imagePath: ogCardPath({
// 	// 		title: buildingName,
// 	// 		subtitle: `${roomCount} room${roomCount === 1 ? '' : 's'} · ${classCount} class${classCount === 1 ? '' : 'es'}${termLabel ? ` · ${termLabel}` : ''}`,
// 	// 		kicker: 'Building at UPLB'
// 	// 	}),
// 	// 	structuredData: jsonLd(
// 	// 		webpageSchema({ title, description, path: canonicalPath }),
// 	// 		breadcrumbSchema([
// 	// 			{ name: 'Home', path: '/' },
// 	// 			{ name: 'Buildings', path: entityIndexPath('buildings') },
// 	// 			{ name: buildingName, path: canonicalPath }
// 	// 		]),
// 	// 		{
// 	// 			'@context': 'https://schema.org',
// 	// 			'@type': 'Place',
// 	// 			name: buildingName,
// 	// 			description: building.directions ?? description,
// 	// 			url: absoluteUrl(canonicalPath),
// 	// 			image: ogImageUrl(building.imageUrl ?? undefined),
// 	// 			geo:
// 	// 				building.lat !== null && building.lon !== null
// 	// 					? {
// 	// 							'@type': 'GeoCoordinates',
// 	// 							latitude: building.lat,
// 	// 							longitude: building.lon
// 	// 						}
// 	// 					: undefined
// 	// 		}
// 	// 	)
// 	// };

// 	// return { seo, initialSearch: { category: 'building' as const, value: buildingName } };
// };
