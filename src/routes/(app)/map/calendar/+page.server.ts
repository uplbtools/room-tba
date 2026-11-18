import type { SeoData } from '#lib/components/seo/seo-data.js';
import { breadcrumbSchema, jsonLd, webpageSchema } from '#lib/utils/site.js';
import type { PageServerLoad } from './$types';

const title = 'Academic Calendar | Room TBA';
const description =
	'See where today falls in the UPLB academic year, with the instructional windows per CRS term, the in-session term and class counts.';
const canonicalPath = '/map/calendar';

export const load: PageServerLoad = () => {
	const seo: SeoData = {
		title,
		description,
		canonicalPath,
		structuredData: jsonLd(
			webpageSchema({ title, description, path: canonicalPath }),
			breadcrumbSchema([
				{ name: 'Home', path: '/' },
				{ name: 'Academic Calendar', path: canonicalPath }
			])
		)
	};
	return { seo };
};
