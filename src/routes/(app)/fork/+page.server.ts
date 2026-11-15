import type { SeoData } from '#lib/components/seo/seo-data.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	const seo: SeoData = {
		title: 'Fork Room TBA for your campus | Room TBA',
		description:
			'Point a map at your campus, name it, and walk away with a campus.config.ts and a Vercel deploy link for your own Room TBA.',
		canonicalPath: '/fork'
	};
	return { seo };
};
