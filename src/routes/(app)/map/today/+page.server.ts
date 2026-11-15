import type { SeoData } from '#lib/components/seo/seo-data.js';
import { breadcrumbSchema, jsonLd, webpageSchema } from '#lib/utils/site.js';
import type { PageServerLoad } from './$types';

const title = 'Today | Room TBA';
const description =
	'Your UPLB classes today, tomorrow, and the rest of the week, in time order, with a link to each room on the campus map.';
const canonicalPath = '/map/today';

export const load: PageServerLoad = () => {
	const seo: SeoData = {
		title,
		description,
		canonicalPath,
		structuredData: jsonLd(
			webpageSchema({ title, description, path: canonicalPath }),
			breadcrumbSchema([
				{ name: 'Home', path: '/' },
				{ name: 'Today', path: canonicalPath }
			])
		)
	};
	return { seo };
};
