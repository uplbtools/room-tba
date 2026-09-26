// import { error } from '@sveltejs/kit';
// import { getDormRouteSlug } from '$lib/utils/app-data';
// import type { SeoData } from '$lib/components/seo/seo-data';
// import { entityIndexPath, getDormCanonicalPath } from '$lib/utils/entity/entity-urls';
// import { parseIdRouteSlug } from '$lib/utils/route/route-slugs';
// import { getDormPageData } from '$lib/services/page-data/entity';
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
// 	const dormId = parseIdRouteSlug(params.slug);
// 	if (!dormId) error(404, 'Not Found');

// 	const appData = await getDormPageData(dormId);
// 	if (appData === null) error(404, 'Not Found');

// 	const { dorm } = appData;
// 	const canonicalPath = getDormCanonicalPath(dorm);
// 	const title = `${dorm.dormName} | Dorm at UPLB | Room TBA`;
// 	const description = [
// 		`Find ${dorm.dormName} at UPLB on Room TBA.`,
// 		dorm.isUpManaged ? 'UP-managed housing listing.' : 'Private housing listing.',
// 		dorm.priceRange ? `Price range: ${dorm.priceRange}.` : null
// 	]
// 		.filter((value): value is string => Boolean(value))
// 		.join(' ');

// 	const seo: SeoData = {
// 		title,
// 		description,
// 		canonicalPath,
// 		imagePath: ogCardPath({
// 			title: dorm.dormName,
// 			subtitle: `${dorm.isUpManaged ? 'UP-managed' : 'Private'} housing${dorm.priceRange ? ` · ${dorm.priceRange}` : ''}${dorm.gender ? ` · ${dorm.gender}` : ''}`,
// 			kicker: 'Dorm at UPLB'
// 		}),
// 		structuredData: jsonLd(
// 			webpageSchema({ title, description, path: canonicalPath }),
// 			breadcrumbSchema([
// 				{ name: 'Home', path: '/' },
// 				{ name: 'Dorms', path: entityIndexPath('dorms') },
// 				{ name: dorm.dormName, path: canonicalPath }
// 			]),
// 			{
// 				'@context': 'https://schema.org',
// 				'@type': 'Place',
// 				name: dorm.dormName,
// 				description,
// 				url: absoluteUrl(canonicalPath),
// 				image: ogImageUrl(dorm.imageUrl ?? undefined),
// 				address: {
// 					'@type': 'PostalAddress',
// 					addressLocality: 'Los Banos',
// 					addressRegion: 'Laguna',
// 					addressCountry: 'PH'
// 				},
// 				geo:
// 					dorm.lat !== null && dorm.lon !== null
// 						? { '@type': 'GeoCoordinates', latitude: dorm.lat, longitude: dorm.lon }
// 						: undefined
// 			}
// 		)
// 	};

// 	return { seo, initialSearch: { category: 'dorm' as const, value: dorm.dormName } };
// };
