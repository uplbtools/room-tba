// import { error } from '@sveltejs/kit';
// import { getCollegeSlug } from '$lib/utils/app-data';
// import type { SeoData } from '$lib/components/seo/seo-data';
// import { entityIndexPath, getCollegeCanonicalPath } from '$lib/utils/entity/entity-urls';
// import { getCollegePageData, resolveCollegeNameFromSlug } from '$lib/services/page-data/entity';
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
// 	const name = await resolveCollegeNameFromSlug(params.slug);
// 	if (!name) error(404, 'Not Found');

// 	const appData = await getCollegePageData(name);
// 	if (appData === null) error(404, 'Not Found');

// 	const { college, roomCount } = appData;
// 	const canonicalPath = getCollegeCanonicalPath(college.collegeName);
// 	const title = `${college.collegeName} | College at UPLB | Room TBA`;
// 	const description = `${college.collegeName} has ${roomCount} room${roomCount === 1 ? '' : 's'} listed at UPLB. Open the college view on Room TBA to browse linked rooms.`;

// 	const seo: SeoData = {
// 		title,
// 		description,
// 		canonicalPath,
// 		imagePath: ogCardPath({
// 			title: college.collegeName,
// 			subtitle: `${roomCount} room${roomCount === 1 ? '' : 's'} linked · UPLB Los Baños`,
// 			kicker: 'College at UPLB'
// 		}),
// 		structuredData: jsonLd(
// 			webpageSchema({ title, description, path: canonicalPath }),
// 			breadcrumbSchema([
// 				{ name: 'Home', path: '/' },
// 				{ name: 'Colleges', path: entityIndexPath('colleges') },
// 				{ name: college.collegeName, path: canonicalPath }
// 			]),
// 			{
// 				'@context': 'https://schema.org',
// 				'@type': 'EducationalOrganization',
// 				name: college.collegeName,
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

// 	return { seo, initialSearch: { category: 'college' as const, value: college.collegeName } };
// };
