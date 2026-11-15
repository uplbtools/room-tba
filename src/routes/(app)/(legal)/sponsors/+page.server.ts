import type { SeoData } from '#lib/components/seo/seo-data.js';
import { breadcrumbSchema, jsonLd, webpageSchema } from '#lib/utils/site.js';
import type { PageServerLoad } from './$types';

const title = 'Sponsors | Room TBA';
const description =
	'Room TBA is funded by curated campus-relevant sponsors. See who supports the project and how the funding model works.';
const canonicalPath = '/sponsors';

export const load: PageServerLoad = () => {
	const seo: SeoData = {
		title,
		description,
		canonicalPath,
		structuredData: jsonLd(
			webpageSchema({ title, description, path: canonicalPath }),
			breadcrumbSchema([
				{ name: 'Home', path: '/' },
				{ name: 'Sponsors', path: canonicalPath }
			])
		)
	};
	return { seo };
};
