import type { SeoData } from '#lib/components/seo/seo-data.js';
import { breadcrumbSchema, jsonLd, webpageSchema } from '#lib/utils/site.js';
import type { PageServerLoad } from './$types';

const title = 'Donate | Room TBA';
const description =
	'Support Room TBA and UPLB Tools with a one-time donation. Every peso goes to hosting, contributor payouts, and keeping the map free.';
const canonicalPath = '/donate';

export const load: PageServerLoad = () => {
	const seo: SeoData = {
		title,
		description,
		canonicalPath,
		structuredData: jsonLd(
			webpageSchema({ title, description, path: canonicalPath }),
			breadcrumbSchema([
				{ name: 'Home', path: '/' },
				{ name: 'Donate', path: canonicalPath }
			])
		)
	};
	return { seo };
};
