import type { SeoData } from '#lib/components/seo/seo-data.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	const seo: SeoData = {
		title: 'Directions | Room TBA',
		description: 'Walking directions between places at UPLB.',
		canonicalPath: '/map/directions/',
		robots: 'noindex, follow'
	};
	return { seo };
};
