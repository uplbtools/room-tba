import { readFileSync } from 'node:fs';
import { describe, expect, test, vi } from 'vitest';

vi.mock('$lib/utils/overlay-stack.js', () => ({
	dismissEphemeralOverlays: vi.fn()
}));

import { openBrowseClasses, openCampusBrowse } from '$lib/utils/campus/browse-campus';
import SidePanelStore from '$lib/stores/ui/SidePanelStore.svelte';

type MocksearchInfo = {
	category: string | null;
	type: string;
	queryValue: string;
	inputValue: string;
	updateQuery: (obj: { category: string | null; type: string; value: string }) => void;
};

function mocksearchInfo(): MocksearchInfo {
	const store: MocksearchInfo = {
		category: null,
		type: 'query',
		queryValue: '',
		inputValue: '',
		updateQuery(obj) {
			store.category = obj.category;
			store.type = obj.type;
			store.queryValue = obj.value;
			store.inputValue = obj.value;
		}
	};
	return store;
}

/**
 * Use the real SidePanelStore, not a hand-rolled double: the regression these
 * tests guard is that `active` is only ever set by `openPanel()`. A double that
 * implements `expand()` alone would keep passing while the panel stays invisible.
 */
function panelStore() {
	const store = new SidePanelStore();
	store.collapse();
	return store;
}

describe('openCampusBrowse', () => {
	test('sets browse query, clears search input, and expands the drawer', () => {
		const searchInfo = mocksearchInfo();
		const sidePanelStore = panelStore();
		openCampusBrowse(searchInfo as never, sidePanelStore, 'divisions');
		expect(searchInfo.category).toBe('browse');
		expect(searchInfo.queryValue).toBe('divisions');
		expect(searchInfo.inputValue).toBe('');
		expect(sidePanelStore.collapsed).toBe(false);
	});

	test('activates the side panel so the browse list actually renders', () => {
		const sidePanelStore = panelStore();
		openCampusBrowse(mocksearchInfo() as never, sidePanelStore, 'organizations');
		expect(sidePanelStore.active).toBe(true);
		expect(sidePanelStore.state?.type).toBe('browsing-entities');
	});
});

describe('openBrowseClasses', () => {
	test('opens classes list and expands the drawer', () => {
		const searchInfo = mocksearchInfo();
		const sidePanelStore = panelStore();
		openBrowseClasses(searchInfo as never, sidePanelStore);
		expect(searchInfo.category).toBe('classes');
		expect(searchInfo.queryValue).toBe('All classes');
		expect(sidePanelStore.collapsed).toBe(false);
	});

	test('activates the side panel so the classes list actually renders', () => {
		const sidePanelStore = panelStore();
		openBrowseClasses(mocksearchInfo() as never, sidePanelStore);
		expect(sidePanelStore.active).toBe(true);
		expect(sidePanelStore.state?.type).toBe('browsing-entities');
	});

	test('still sets the query when the caller opens the panel itself', () => {
		// Sidebar.svelte calls the single-arg form and then opens the panel with its
		// own component; the helper must not throw or no-op on the query.
		const searchInfo = mocksearchInfo();
		expect(() => openBrowseClasses(searchInfo as never)).not.toThrow();
		expect(searchInfo.category).toBe('classes');
	});
});

/**
 * Regression guard for the silent breakage in #835: the browse helpers are
 * reached from several components, and a call site that sets a query without
 * activating the panel renders nothing at all — no error, no failing test.
 * These assert the *call sites* still pass the store, so the panel opens.
 */
describe('browse helper call sites keep the side panel wired', () => {
	const CALL_SITES: Array<{ file: string; helper: string }> = [
		{
			file: 'src/lib/components/search/CampusBrowseChips.svelte',
			helper: 'openBrowseClasses'
		},
		{
			file: 'src/lib/components/search/CampusBrowseChips.svelte',
			helper: 'openCampusBrowse'
		},
		{
			file: 'src/lib/components/navigation/Sidebar.svelte',
			helper: 'openCampusBrowse'
		},
		{
			file: 'src/lib/components/navigation/Sidebar.svelte',
			helper: 'openBrowseClasses'
		},
		{
			file: 'src/lib/components/modal/StudentOrgsModal.svelte',
			helper: 'openCampusBrowse'
		},
		{
			file: 'src/lib/components/controls/EntityBackToList.svelte',
			helper: 'openCampusBrowse'
		},
		{
			file: 'src/lib/components/Entry.svelte',
			helper: 'openCampusBrowse'
		},
		{
			file: 'src/lib/components/EntityUrlSync.svelte',
			helper: 'openCampusBrowse'
		}
	];

	test.each(CALL_SITES)('$file passes sidePanelStore to $helper', ({ file, helper }) => {
		const source = readFileSync(file, 'utf8');
		const calls = source.match(new RegExp(`${helper}\\([^)]*\\)`, 'g')) ?? [];
		expect(calls.length).toBeGreaterThan(0);
		for (const call of calls) {
			expect(call).toContain('sidePanelStore');
		}
	});
});
