import { describe, expect, test, vi } from 'vitest';

vi.mock('#lib/utils/context.js', () => ({ getToast: () => ({ show: vi.fn() }) }));

import UserLocation from './UserLocation.svelte.js';
import type { MapStore } from './map-stores.svelte.js';

function setup() {
	const userLocation = new UserLocation();
	userLocation.coords = [121.24, 14.16];
	const mapInstance = {
		flyTo: vi.fn(),
		easeTo: vi.fn(),
		getZoom: () => 15,
		getBearing: () => 40
	};
	const map = { getRawInstance: () => mapInstance } as unknown as MapStore;
	return { userLocation, mapInstance, map };
}

describe('UserLocation follow mode', () => {
	test('the first tap flies to the user and starts following', () => {
		const { userLocation, mapInstance, map } = setup();
		userLocation.cycleFollow(map);
		expect(userLocation.followMode).toBe('follow');
		expect(mapInstance.flyTo).toHaveBeenCalledWith(
			expect.objectContaining({ center: [121.24, 14.16], zoom: 17 })
		);
	});

	test('a second tap turns the map to the heading, and a third puts north up', () => {
		const { userLocation, mapInstance, map } = setup();
		userLocation.bearing = 90;
		userLocation.cycleFollow(map);
		userLocation.cycleFollow(map);
		expect(userLocation.followMode).toBe('heading');
		expect(mapInstance.easeTo).toHaveBeenLastCalledWith(expect.objectContaining({ bearing: 90 }));
		userLocation.cycleFollow(map);
		expect(userLocation.followMode).toBe('follow');
		expect(mapInstance.easeTo).toHaveBeenLastCalledWith(expect.objectContaining({ bearing: 0 }));
	});

	test('the phone compass wins over the direction of travel', () => {
		const { userLocation, mapInstance, map } = setup();
		userLocation.bearing = 90;
		userLocation.deviceHeading = 200;
		userLocation.cycleFollow(map);
		userLocation.cycleFollow(map);
		expect(mapInstance.easeTo).toHaveBeenLastCalledWith(expect.objectContaining({ bearing: 200 }));
	});

	test('a new fix moves the map only while following', () => {
		const { userLocation, mapInstance, map } = setup();
		userLocation.follow(map);
		expect(mapInstance.easeTo).not.toHaveBeenCalled();
		userLocation.followMode = 'follow';
		userLocation.follow(map);
		expect(mapInstance.easeTo).toHaveBeenCalledWith(
			expect.objectContaining({ center: [121.24, 14.16] })
		);
	});

	test('does nothing while the map is still loading', () => {
		const { userLocation } = setup();
		userLocation.cycleFollow({ getRawInstance: () => undefined } as unknown as MapStore);
		expect(userLocation.followMode).toBe('off');
	});
});
