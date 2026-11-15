import type { SeoData } from '#lib/components/seo/seo-data.js';
import { breadcrumbSchema, jsonLd, webpageSchema } from '#lib/utils/site.js';
import type { PageServerLoad } from './$types';

const title = 'Final Exam Schedule | Room TBA';
const description =
	'Browse the UPLB final exam schedule by term: search courses, sections, and rooms with dates and times from OUR releases.';
const canonicalPath = '/map/final-exams';

export const load: PageServerLoad = () => {
	const seo: SeoData = {
		title,
		description,
		canonicalPath,
		structuredData: jsonLd(
			webpageSchema({ title, description, path: canonicalPath }),
			breadcrumbSchema([
				{ name: 'Home', path: '/' },
				{ name: 'Final exams', path: canonicalPath }
			])
		)
	};
	return { seo };
};
