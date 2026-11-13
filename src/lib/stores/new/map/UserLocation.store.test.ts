import { describe, expect, test, vi } from 'vitest';

vi.mock('#lib/utils/context.js', () => ({ getToast: () => ({ show: vi.fn() }) }));

import UserLocation from './UserLocation.svelte.js';
import type { MapStore } from './map-stores.svelte.js';

describe('UserLocation.recenter', () => {
	test('flies to the user once the map is ready', () => {
		const userLocation = new UserLocation();
		userLocation.coords = [121.24, 14.16];
		const flyTo = vi.fn();
		userLocation.recenter({ isMapReady: () => true, flyTo } as unknown as MapStore);
		expect(flyTo).toHaveBeenCalledWith(expect.objectContaining({ center: [121.24, 14.16] }));
	});

	test('does not fly while the map is still loading', () => {
		const userLocation = new UserLocation();
		userLocation.coords = [121.24, 14.16];
		const flyTo = vi.fn();
		userLocation.recenter({ isMapReady: () => false, flyTo } as unknown as MapStore);
		expect(flyTo).not.toHaveBeenCalled();
	});
});
