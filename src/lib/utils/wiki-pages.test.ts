import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { WIKI_INDEX_PATH, WIKI_PAGES, WIKI_PATHS, wikiCorrectionUrl } from './wiki-pages';

const root = process.cwd();
const wikiDir = join(root, 'src/routes/(app)/wiki');
const articleDirs = readdirSync(wikiDir, { withFileTypes: true })
	.filter((entry) => entry.isDirectory())
	.map((entry) => entry.name);

describe('wiki page registry', () => {
	test('lists exactly the article routes', () => {
		expect(WIKI_PAGES.map((page) => page.path).sort()).toEqual(
			articleDirs.map((name) => `/wiki/${name}`).sort()
		);
	});

	test('every entry points at its own page file and has a unique path', () => {
		for (const page of WIKI_PAGES) {
			expect(existsSync(join(root, page.sourcePath))).toBe(true);
			expect(page.sourcePath).toBe(`src/routes/(app)${page.path}/+page.svelte`);
		}
		expect(new Set(WIKI_PATHS).size).toBe(WIKI_PATHS.length);
		expect(WIKI_PATHS[0]).toBe(WIKI_INDEX_PATH);
	});
});

describe('correction link', () => {
	test('opens a prefilled GitHub issue naming the page', () => {
		const url = new URL(wikiCorrectionUrl('Campus curfew', '/wiki/campus-curfew'));
		expect(url.pathname.endsWith('/issues/new')).toBe(true);
		expect(url.searchParams.get('title')).toBe('Wiki correction: Campus curfew');
		expect(url.searchParams.get('body')).toContain('/wiki/campus-curfew');
	});
});
