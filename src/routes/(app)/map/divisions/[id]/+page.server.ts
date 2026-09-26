// import { error } from '@sveltejs/kit';
// import { getDivisionSlug } from '$lib/utils/app-data';
// import type { SeoData } from '$lib/components/seo/seo-data';
// import { entityIndexPath, getDivisionCanonicalPath } from '$lib/utils/entity/entity-urls';
// import { getDivisionPageData, resolveDivisionNameFromSlug } from '$lib/services/page-data/entity';
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
// 	const name = await resolveDivisionNameFromSlug(params.slug);
// 	if (!name) error(404, 'Not Found');

// 	const appData = await getDivisionPageData(name);
// 	if (appData === null) error(404, 'Not Found');

// 	const { division, roomCount } = appData;
// 	const canonicalPath = getDivisionCanonicalPath(division.divisionName);
// 	const title = `${division.divisionName} | Division at UPLB | Room TBA`;
// 	const description = `${division.divisionName} has ${roomCount} room${roomCount === 1 ? '' : 's'} listed at UPLB. Open the division view on Room TBA to browse linked rooms.`;

// 	const seo: SeoData = {
// 		title,
// 		description,
// 		canonicalPath,
// 		imagePath: ogCardPath({
// 			title: division.divisionName,
// 			subtitle: `${roomCount} room${roomCount === 1 ? '' : 's'} linked · UPLB Los Baños`,
// 			kicker: 'Division at UPLB'
// 		}),
// 		structuredData: jsonLd(
// 			webpageSchema({ title, description, path: canonicalPath }),
// 			breadcrumbSchema([
// 				{ name: 'Home', path: '/' },
// 				{ name: 'Divisions', path: entityIndexPath('divisions') },
// 				{ name: division.divisionName, path: canonicalPath }
// 			]),
// 			{
// 				'@context': 'https://schema.org',
// 				'@type': 'EducationalOrganization',
// 				name: division.divisionName,
// 				description,
// 				url: absoluteUrl(canonicalPath),
// 				image: ogImageUrl(),
// 				parentOrganization: {
// 					'@type': 'CollegeOrUniversity',
// 					name: 'University of the Philippines Los Banos'
// 				}
// 			}
// 		)
// 	};

// 	return { seo, initialSearch: { category: 'division' as const, value: division.divisionName } };
// };
