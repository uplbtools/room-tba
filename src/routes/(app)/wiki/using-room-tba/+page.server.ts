import { wikiPageData } from '#lib/utils/wiki-page-data.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () =>
	wikiPageData({
		path: '/wiki/using-room-tba',
		title: 'Finding a room, a class, or a way across campus | Room TBA Wiki',
		description:
			'Learn how to look up a UPLB room or class, plan your week, save the map for offline use and report wrong data. It also says where the official sources for enrollment, grades and the academic calendar live.',
		crumb: 'Using Room TBA'
	});
