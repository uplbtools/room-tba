import { describe, expect, test } from 'vitest';
import { enhanceWikiPage, WIKI_MINUTES, WIKI_WORDS } from './wiki-handle';

const page = (content: string) =>
	`<head>"${WIKI_WORDS}"</head><p>${WIKI_MINUTES} min read</p><main id="wiki-content" tabindex="-1">${content}</main><nav><h2>See also</h2></nav>`;

const article = `<article><header><h1>T</h1></header><h2>A</h2><h2>B</h2><h2>C</h2><p>one two three four</p></article>`;

describe('enhanceWikiPage', () => {
	test('adds permalinks and a contents list inside the main element only', () => {
		const out = enhanceWikiPage(page(article), false);
		expect(out).toContain('<h2 id="a">A<a class="heading-anchor"');
		expect(out).toContain('</header><nav class="toc"');
		expect(out).toContain('<h2>See also</h2>');
	});

	test('fills the read time and word count', () => {
		const out = enhanceWikiPage(page(article), false);
		expect(out).toContain('<p>1 min read</p>');
		expect(out).toContain('<head>8</head>');
	});

	test('leaves the contents list off the index', () => {
		expect(enhanceWikiPage(page(article), true)).not.toContain('class="toc"');
	});

	test('returns other pages untouched', () => {
		expect(enhanceWikiPage('<main>x</main>', false)).toBe('<main>x</main>');
	});
});
