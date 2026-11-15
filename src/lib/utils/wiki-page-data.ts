import type { SeoData } from '#lib/components/seo/seo-data.js';
import {
	absoluteUrl,
	breadcrumbSchema,
	jsonLd,
	ogCardPath,
	webpageSchema
} from '#lib/utils/site.js';
import { WIKI_WORDS } from './wiki-handle.js';
import { WIKI_INDEX_PATH, WIKI_PAGES, wikiCorrectionUrl } from './wiki-pages.js';
import { wikiProvenance } from './wiki-provenance.js';

type WikiPageInput = {
	path: string;
	title: string;
	description: string;
	crumb?: string;
	dataPath?: string;
};

export function wikiPageData({ path, title, description, crumb, dataPath }: WikiPageInput) {
	const entry = WIKI_PAGES.find((page) => page.path === path);
	const provenance = entry ? wikiProvenance(entry.sourcePath) : null;
	const image = ogCardPath({
		title: entry?.title ?? 'Room TBA Wiki',
		subtitle: description,
		kicker: 'Wiki'
	});

	const articleSchema =
		entry && provenance
			? {
					'@context': 'https://schema.org',
					'@type': 'TechArticle',
					headline: entry.title,
					description,
					url: absoluteUrl(path),
					inLanguage: 'en',
					...(provenance.lastEdited ? { dateModified: provenance.lastEdited } : {}),
					...(provenance.authors.length > 0
						? {
								author: provenance.authors.map((author) => ({
									'@type': 'Person',
									name: author.name,
									...(author.github ? { url: `https://github.com/${author.github}` } : {})
								}))
							}
						: {}),
					publisher: { '@type': 'Organization', name: 'UPLB Tools' },
					isPartOf: {
						'@type': 'WebSite',
						name: 'Room TBA Wiki',
						url: absoluteUrl(WIKI_INDEX_PATH)
					},
					wordCount: WIKI_WORDS
				}
			: null;

	const indexSchema =
		path === WIKI_INDEX_PATH
			? {
					'@context': 'https://schema.org',
					'@type': 'ItemList',
					itemListElement: WIKI_PAGES.map((page, index) => ({
						'@type': 'ListItem',
						position: index + 1,
						url: absoluteUrl(page.path),
						name: page.title
					}))
				}
			: null;

	const seo: SeoData = {
		title,
		description,
		canonicalPath: path,
		imagePath: image,
		structuredData: jsonLd(
			webpageSchema({ title, description, path, image }),
			articleSchema,
			indexSchema,
			breadcrumbSchema([
				{ name: 'Home', path: '/' },
				{ name: 'Wiki', path: WIKI_INDEX_PATH },
				...(crumb ? [{ name: crumb, path }] : [])
			])
		)
	};

	return {
		seo,
		crumb,
		provenance:
			entry && provenance
				? { ...provenance, correctionUrl: wikiCorrectionUrl(entry.title, entry.path) }
				: null,
		dataProvenance: dataPath ? wikiProvenance(dataPath) : null
	};
}
