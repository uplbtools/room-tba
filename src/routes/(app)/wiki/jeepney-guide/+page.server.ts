import { wikiPageData } from '#lib/utils/wiki-page-data.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () =>
	wikiPageData({
		path: '/wiki/jeepney-guide',
		title: 'Jeepneys and buses around UPLB | Room TBA Wiki',
		description:
			"This page covers the UPLB campus jeepney routes, their stops, fares and boarding tips, plus buses to Metro Manila. It's read from the same data the Room TBA map uses.",
		crumb: 'Jeepneys and buses'
	});
