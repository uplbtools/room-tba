import { describe, expect, test } from 'vitest';
import { MapStore } from './map-stores.svelte.js';

describe('MapStore pin picking', () => {
	test('a tap sets the draft pin only while picking', () => {
		const map = new MapStore();
		map.pickPin({ lat: 14.1, lng: 121.2 });
		expect(map.draftPin).toBeNull();

		const stop = map.startPickingPin();
		map.pickPin({ lat: 14.1, lng: 121.2 });
		expect(map.draftPin).toEqual({ lat: 14.1, lon: 121.2 });

		stop();
		expect(map.pickingPin).toBe(false);
		expect(map.draftPin).toBeNull();
	});
});
