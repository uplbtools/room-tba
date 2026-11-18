import type { SeoData } from '#lib/components/seo/seo-data.js';
import { breadcrumbSchema, jsonLd, webpageSchema } from '#lib/utils/site.js';
import type { PageServerLoad } from './$types';

const title = 'Help & FAQ | Room TBA';
const description =
	'Answers to student questions about Room TBA, including 3D building models, data sources, offline use and how to report mistakes.';
const canonicalPath = '/faq';

export const load: PageServerLoad = () => {
	const seo: SeoData = {
		title,
		description,
		canonicalPath,
		structuredData: jsonLd(
			webpageSchema({ title, description, path: canonicalPath }),
			breadcrumbSchema([
				{ name: 'Home', path: '/' },
				{ name: 'Help & FAQ', path: canonicalPath }
			])
		)
	};
	return { seo };
};
