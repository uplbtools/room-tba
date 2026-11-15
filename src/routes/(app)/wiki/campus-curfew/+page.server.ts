import { wikiPageData } from '#lib/utils/wiki-page-data.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () =>
	wikiPageData({
		path: '/wiki/campus-curfew',
		title: 'Campus curfew and dorm permits | Room TBA Wiki',
		description:
			'This page gives UPLB campus curfew hours and return-permit information for UP-managed dorm residents.',
		crumb: 'Campus curfew',
		dataPath: 'src/lib/constants/content/campus-curfew.ts'
	});
