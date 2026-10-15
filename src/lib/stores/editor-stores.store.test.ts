import { beforeEach, describe, expect, test } from 'vitest';
import type { MapProposalTarget } from './store-types.js';
import {
	AdditionProposalStore,
	EditorChromeStore,
	EventPlacementStore,
	MapEditStore,
	MapProposalStore
} from './editor/editor-stores.svelte.js';
import { mapEditStore, terrainStore } from '#lib/stores.svelte.js';

describe('EditorChromeStore', () => {
	let store: EditorChromeStore;

	beforeEach(() => {
		store = new EditorChromeStore();
	});

	test('openAdditionModal opens the addition modal', () => {
		store.openAdditionModal();
		expect(store.additionModalOpen).toBe(true);
		store.closeAdditionModal();
		expect(store.additionModalOpen).toBe(false);
	});
});

describe('MapEditStore', () => {
	let store: MapEditStore;

	beforeEach(() => {
		store = new MapEditStore();
		terrainStore.disable();
	});

	test('enable disables terrain on shared registry', () => {
		terrainStore.enable();
		store.enable();
		expect(store.enabled).toBe(true);
		expect(terrainStore.enabled).toBe(false);
	});

	test('toggle turns edit off when already enabled', () => {
		store.enable();
		store.toggle();
		expect(store.enabled).toBe(false);
	});
});

describe('MapProposalStore', () => {
	let store: MapProposalStore;

	beforeEach(() => {
		store = new MapProposalStore();
	});

	test('pinKey for room target', () => {
		// Rooms are not in MapProposalTarget's union but the store keys any type.
		store.enable({ type: 'room', id: 42 } as unknown as MapProposalTarget);
		expect(store.pinKey()).toBe('room:42');
		expect(store.allowsKey('room:42')).toBe(true);
		expect(store.allowsKey('room:99')).toBe(false);
	});

	test('disable clears target', () => {
		store.enable({ type: 'building', id: 1, label: '', version: 1 });
		store.disable();
		expect(store.enabled).toBe(false);
	});
});

describe('AdditionProposalStore', () => {
	test('requestMapPin resolves delivered coordinates', async () => {
		const store = new AdditionProposalStore();
		const pending = store.requestMapPin();
		store.deliverMapPin(14.1, 121.2);
		await expect(pending).resolves.toEqual({ lat: 14.1, lon: 121.2 });
		expect(store.pinPickActive).toBe(false);
	});

	test('setDraftPinPreview stores preview metadata independently of coords', () => {
		const store = new AdditionProposalStore();
		store.setDraftPinPreview({ kind: 'building', label: 'Baker Hall' });
		expect(store.draftPinPreview).toEqual({
			kind: 'building',
			label: 'Baker Hall'
		});
		store.clearDraftPin();
		expect(store.draftPin).toBeNull();
		expect(store.draftPinPreview).toEqual({
			kind: 'building',
			label: 'Baker Hall'
		});
	});
});

describe('EventPlacementStore', () => {
	let store: EventPlacementStore;

	beforeEach(() => {
		store = new EventPlacementStore();
		mapEditStore.close();
	});

	test('start sets draft and proposing flag', () => {
		store.start(
			{
				slug: 'test-event',
				title: 'Test Event',
				category: 'other',
				startsAt: '2026-01-01T08:00:00+08:00',
				endsAt: '2026-01-01T10:00:00+08:00',
				imageUrl: null
			},
			{ propose: true, submitterName: 'Contributor' }
		);
		expect(store.active).toBe(true);
		expect(store.proposing).toBe(true);
		expect(store.submitterName).toBe('Contributor');
	});

	test('cancel clears draft', () => {
		store.start({
			slug: 'test-event',
			title: 'Test Event',
			category: 'other',
			startsAt: '2026-01-01T08:00:00+08:00',
			endsAt: '2026-01-01T10:00:00+08:00',
			imageUrl: null
		});
		store.cancel();
		expect(store.active).toBe(false);
	});
});
