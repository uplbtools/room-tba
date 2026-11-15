import type { SeoData } from '#lib/components/seo/seo-data.js';
import { breadcrumbSchema, jsonLd, webpageSchema } from '#lib/utils/site.js';
import type { PageServerLoad } from './$types';

const title = 'Terms of Service | Room TBA';
const description = 'Terms for using Room TBA, contributing data, and editor accounts.';
const canonicalPath = '/terms';

export const load: PageServerLoad = () => {
	const seo: SeoData = {
		title,
		description,
		canonicalPath,
		structuredData: jsonLd(
			webpageSchema({ title, description, path: canonicalPath }),
			breadcrumbSchema([
				{ name: 'Home', path: '/' },
				{ name: 'Terms of Service', path: canonicalPath }
			])
		)
	};
	return { seo };
};
