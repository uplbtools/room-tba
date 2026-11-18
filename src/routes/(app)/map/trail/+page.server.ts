import type { SeoData } from '#lib/components/seo/seo-data.js';
import { MAKILING_TRAILS } from '#lib/constants/map/makiling-trail.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const seo: SeoData = {
		title: 'Mt. Makiling Trails | Room TBA',
		description: `Length, climb, stations and rules for the ${MAKILING_TRAILS.map((trail) => trail.name).join(' and ')}.`,
		canonicalPath: '/map/trail'
	};
	return { seo };
};
