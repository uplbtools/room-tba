import type { Handle } from '@sveltejs/kit';
import { enhanceWikiHtml, insertToc, readingMinutes, wikiTocHtml } from './wiki-html.js';
import { WIKI_INDEX_PATH } from './wiki-pages.js';

export const WIKI_MINUTES = '%wiki-minutes%';
export const WIKI_WORDS = '%wiki-words%';

const MAIN_OPEN = /<main id="wiki-content"[^>]*>/;

export function enhanceWikiPage(html: string, isIndex: boolean): string {
	const open = MAIN_OPEN.exec(html);
	if (!open) return html;
	const from = open.index + open[0].length;
	const end = html.indexOf('</main>', from);
	if (end === -1) return html;
	const enhanced = enhanceWikiHtml(html.slice(from, end));
	const content = isIndex ? enhanced.html : insertToc(enhanced.html, wikiTocHtml(enhanced.toc));
	return (html.slice(0, from) + content + html.slice(end))
		.replace(WIKI_MINUTES, String(readingMinutes(enhanced.words)))
		.replace(`"${WIKI_WORDS}"`, String(enhanced.words));
}

export const wikiHandle: Handle = ({ event, resolve }) => {
	const { pathname } = event.url;
	if (pathname !== WIKI_INDEX_PATH && !pathname.startsWith(`${WIKI_INDEX_PATH}/`)) {
		return resolve(event);
	}
	let html = '';
	return resolve(event, {
		transformPageChunk: ({ html: chunk, done }) => {
			html += chunk;
			return done ? enhanceWikiPage(html, pathname === WIKI_INDEX_PATH) : '';
		}
	});
};
