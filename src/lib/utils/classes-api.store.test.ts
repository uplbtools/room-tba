import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ClassQueryPage } from '#lib/utils/classes-api.js';

// fetchClassPage only needs getJSONFetch (which is `fetch(url).json()`). The real
// util transitively boots the whole Svelte-rune store graph, so mock the boundary
// and assert the /api/classes URL fetchClassPage builds from its options.
// (.store.test.ts so it runs under vitest, where vi.mock is hoisted + file-scoped
// — a bun mock.module here would leak into every other test in the run.)
const { getJSONFetch } = vi.hoisted(() => ({ getJSONFetch: vi.fn() }));
vi.mock('#lib/utils/local/data/utils.js', () => ({ getJSONFetch }));

import { fetchAllClasses, fetchClassPage } from '#lib/utils/classes-api.js';

const calledUrl = (call = 0) => new URL(getJSONFetch.mock.calls[call][0], 'http://x');

describe('fetchClassPage', () => {
	beforeEach(() => {
		getJSONFetch.mockReset();
		getJSONFetch.mockResolvedValue({
			rows: [],
			nextCursor: null,
			hasMore: false
		});
	});

	it('hits /api/classes and encodes every provided option', async () => {
		const result = {
			rows: [{ courseCode: 'CMSC 128' }],
			nextCursor: 'b3BhcXVl',
			hasMore: true
		} as unknown as ClassQueryPage;
		getJSONFetch.mockResolvedValueOnce(result);

		const page = await fetchClassPage({
			termId: 1252,
			courseCodePrefix: 'CMSC',
			limit: 10,
			cursor: 'cHJldi1wYWdl'
		});

		const url = calledUrl();
		expect(url.pathname).toBe('/api/classes');
		expect(url.searchParams.get('term_id')).toBe('1252');
		expect(url.searchParams.get('course_code')).toBe('CMSC');
		expect(url.searchParams.get('limit')).toBe('10');
		expect(url.searchParams.get('cursor')).toBe('cHJldi1wYWdl');
		expect(page).toEqual(result);
	});

	it('defaults limit to 25 and sends no cursor or offset', async () => {
		await fetchClassPage({ termId: 1252 });
		const p = calledUrl().searchParams;
		expect(p.get('limit')).toBe('25');
		expect(p.has('cursor')).toBe(false);
		expect(p.has('offset')).toBe(false);
	});

	it('omits term_id when null and a blank course code', async () => {
		await fetchClassPage({ termId: null, courseCodePrefix: '   ' });
		const p = calledUrl().searchParams;
		expect(p.has('term_id')).toBe(false);
		expect(p.has('course_code')).toBe(false);
	});

	it('trims a padded course code prefix', async () => {
		await fetchClassPage({ courseCodePrefix: '  MATH 27  ' });
		expect(calledUrl().searchParams.get('course_code')).toBe('MATH 27');
	});

	it('propagates fetch errors to the caller', async () => {
		getJSONFetch.mockRejectedValueOnce(new Error('network down'));
		await expect(fetchClassPage({ termId: 1252 })).rejects.toThrow('network down');
	});
});

describe('fetchAllClasses', () => {
	beforeEach(() => {
		getJSONFetch.mockReset();
	});

	it('walks the cursor chain until hasMore is false', async () => {
		getJSONFetch
			.mockResolvedValueOnce({
				rows: [{ courseCode: 'HK 12', section: 'A' }],
				nextCursor: 'cGFnZTI',
				hasMore: true
			})
			.mockResolvedValueOnce({
				rows: [{ courseCode: 'HK 12', section: 'B' }],
				nextCursor: null,
				hasMore: false
			});

		const all = await fetchAllClasses({
			termId: 1252,
			courseCodePrefix: 'HK 12'
		});

		expect(all.rows.map((r) => r.section)).toEqual(['A', 'B']);
		expect(all.hasMore).toBe(false);
		expect(getJSONFetch).toHaveBeenCalledTimes(2);
		expect(calledUrl(0).searchParams.has('cursor')).toBe(false);
		expect(calledUrl(1).searchParams.get('cursor')).toBe('cGFnZTI');
	});

	it('stops on an empty page even if the server claims more', async () => {
		getJSONFetch.mockResolvedValue({
			rows: [],
			nextCursor: 'bG9vcA',
			hasMore: true
		});
		const all = await fetchAllClasses({ termId: 1252 });
		expect(all.rows).toEqual([]);
		expect(getJSONFetch).toHaveBeenCalledTimes(1);
	});
});
