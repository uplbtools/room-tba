import { wikiPageData } from '#lib/utils/wiki-page-data.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () =>
	wikiPageData({
		path: '/wiki/section-times',
		title: 'What times do UPLB section names correspond to? | Room TBA Wiki',
		description:
			'This page is a glossary of UPLB AMIS section codes. It covers letter ladders, NSTP/HK/GI/residency/ROTC, MS/PhD course numbers (200+/300+/400+), every activity type and L/R/C suffixes.',
		crumb: 'Section times'
	});
