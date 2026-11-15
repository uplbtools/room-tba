import { wikiPageData } from '#lib/utils/wiki-page-data.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () =>
	wikiPageData({
		path: '/wiki/upcat-at-uplb',
		title: 'Taking the UPCAT at UP Los Baños | Room TBA Wiki',
		description:
			"This is a first-timer's guide to the UPCAT at UPLB, written for the August 1 and 2, 2026 exam. It covers what the test permit does and doesn't tell you, what to bring, how to get on campus and how to load the campus map before mobile data gets congested.",
		crumb: 'UPCAT at UPLB'
	});
