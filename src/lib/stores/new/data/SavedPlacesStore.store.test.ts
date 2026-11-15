import { beforeEach, describe, expect, test } from 'vitest';
import SavedPlacesStore from './SavedPlacesStore.svelte.js';

describe('SavedPlacesStore', () => {
	beforeEach(() => localStorage.clear());

	test('toggle saves and unsaves, and a new store reads it back', () => {
		const store = new SavedPlacesStore();
		expect(store.toggle('/map/buildings/1', 'Physci')).toBe(true);
		expect(store.isSaved('/map/buildings/1')).toBe(true);

		const reloaded = new SavedPlacesStore();
		reloaded.hydrate();
		expect(reloaded.saved.map((p) => p.label)).toEqual(['Physci']);

		expect(reloaded.toggle('/map/buildings/1', 'Physci')).toBe(false);
		expect(reloaded.saved).toEqual([]);
	});

	test('recent keeps the newest 10 with no duplicates', () => {
		const store = new SavedPlacesStore();
		for (let id = 1; id <= 12; id++) store.record(`/map/rooms/${id}`, `Room ${id}`);
		store.record('/map/rooms/5', 'Room 5');

		expect(store.recent).toHaveLength(10);
		expect(store.recent[0].href).toBe('/map/rooms/5');
		expect(store.recent.filter((p) => p.href === '/map/rooms/5')).toHaveLength(1);
	});

	test('bad stored data is dropped', () => {
		localStorage.setItem('saved-places-v2', JSON.stringify([{ href: 1 }, 'x', null]));
		const store = new SavedPlacesStore();
		store.hydrate();
		expect(store.saved).toEqual([]);
	});
});
