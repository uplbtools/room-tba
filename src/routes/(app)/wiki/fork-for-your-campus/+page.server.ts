import { wikiPageData } from '#lib/utils/wiki-page-data.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () =>
	wikiPageData({
		path: '/wiki/fork-for-your-campus',
		title: 'Fork this for your campus | Room TBA Wiki',
		description:
			'This page covers what you have to change to run Room TBA for a different campus. That includes the UPLB-specific data and glue to rip out, the config to repoint and the parts you write yourself.',
		crumb: 'Fork for your campus'
	});
