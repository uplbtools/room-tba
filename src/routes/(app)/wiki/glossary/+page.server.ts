import { wikiPageData } from '#lib/utils/wiki-page-data.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () =>
	wikiPageData({
		path: '/wiki/glossary',
		title: 'UPLB glossary: TBA, LH, AB, CAS and more | Room TBA Wiki',
		description:
			'This page explains what the abbreviations on UPLB class schedules, room signs and building names stand for, including TBA, AMIS, LH, LR, AB, WF, CAS, CEAT and the rest.',
		crumb: 'Glossary'
	});
