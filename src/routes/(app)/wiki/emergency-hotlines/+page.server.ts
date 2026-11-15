import { wikiPageData } from '#lib/utils/wiki-page-data.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () =>
	wikiPageData({
		path: '/wiki/emergency-hotlines',
		title: 'Emergency hotlines | Room TBA Wiki',
		description:
			'This page lists emergency hotline numbers for UPLB, Los Baños and nearby medical services.',
		crumb: 'Emergency hotlines',
		dataPath: 'src/lib/constants/content/emergency-hotlines.ts'
	});
