import { WIKI_INDEX_PATH, WIKI_PAGES } from '#lib/utils/wiki-pages.js';
import { wikiPageData } from '#lib/utils/wiki-page-data.js';
import { wikiProvenance } from '#lib/utils/wiki-provenance.js';
import type { PageServerLoad } from './$types';

const dateFormat = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' });

const faq = {
	path: '/faq',
	title: 'Frequently asked questions',
	kicker: 'Student FAQ',
	blurb:
		'Answers on where the 3D building models come from, whether Room TBA is official UPLB, how class and room data is updated and how to report wrong data.',
	sourcePath: 'src/routes/(app)/(legal)/faq/+page.svelte'
};

export const load: PageServerLoad = () => ({
	...wikiPageData({
		path: WIKI_INDEX_PATH,
		title: 'Wiki | Room TBA',
		description:
			'Read plain-language guides to UPLB class schedules, section names, rooms, jeepneys and campus systems, backed by Room TBA data.'
	}),
	articles: [...WIKI_PAGES, faq].map((article) => {
		const { authors, lastEdited } = wikiProvenance(article.sourcePath);
		return {
			path: article.path,
			title: article.title,
			kicker: article.kicker,
			blurb: article.blurb,
			authors: authors.map((author) => author.name).join(', '),
			lastEdited: lastEdited ? dateFormat.format(new Date(lastEdited)) : null
		};
	})
});
