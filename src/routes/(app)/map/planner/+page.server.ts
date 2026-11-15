import type { SeoData } from '#lib/components/seo/seo-data.js';
import { breadcrumbSchema, jsonLd, ogCardPath, webpageSchema } from '#lib/utils/site.js';
import type { PageServerLoad } from './$types';

const title = 'Class Planner | Room TBA';
const description =
	'Plan your UPLB class schedule: add sections by term, spot conflicts, and export to your calendar.';
const canonicalPath = '/map/planner/';

export const load: PageServerLoad = () => {
	const seo: SeoData = {
		title,
		description,
		canonicalPath,
		imagePath: ogCardPath({
			title: 'Class Planner',
			subtitle: 'Plan your UPLB class schedule by term',
			kicker: 'Planner'
		}),
		structuredData: jsonLd(
			webpageSchema({ title, description, path: canonicalPath }),
			breadcrumbSchema([
				{ name: 'Home', path: '/' },
				{ name: 'Class Planner', path: canonicalPath }
			])
		)
	};
	return { seo };
};
