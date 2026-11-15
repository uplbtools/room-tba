import type { Handle } from '@sveltejs/kit';
import { enhanceWikiHtml, insertToc, readingMinutes, wikiTocHtml } from './wiki-html.js';
import { WIKI_INDEX_PATH } from './wiki-pages.js';

export const WIKI_MINUTES = '%wiki-minutes%';
export const WIKI_WORDS = '%wiki-words%';

const MAIN_OPEN = '<main id="wiki-content" tabindex="-1">';

export function enhanceWikiPage(html: string, isIndex: boolean): string {
	const start = html.indexOf(MAIN_OPEN);
	const end = html.indexOf('</main>', start);
	if (start === -1 || end === -1) return html;
	const from = start + MAIN_OPEN.length;
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
