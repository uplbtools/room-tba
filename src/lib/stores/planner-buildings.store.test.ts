import { beforeEach, describe, expect, test, vi } from 'vitest';

const { getJSONFetch, getLocalRoomByCode } = vi.hoisted(() => ({
	getJSONFetch: vi.fn(),
	getLocalRoomByCode: vi.fn()
}));

vi.mock('../utils/local/data/utils.js', () => ({
	getJSONFetch,
	getLocalRoomByCode,
	getBuildingIdsWithClasses: vi.fn(),
	getLocalClassesForRoom: vi.fn()
}));

import PlannerBuildingsStore from './data/PlannerBuildingsStore.svelte.js';

describe('PlannerBuildingsStore', () => {
	beforeEach(() => {
		getJSONFetch.mockReset();
		getLocalRoomByCode.mockReset();
		getLocalRoomByCode.mockResolvedValue(null);
		getJSONFetch.mockResolvedValue({ data: null });
	});

	test('resolves building ids from PGlite first', async () => {
		getLocalRoomByCode.mockImplementation(async (code: string) => ({
			buildingId: code === 'ICB 12' ? 7 : 9
		}));

		const store = new PlannerBuildingsStore();
		await store.load(['ICB 12', 'PSLH-A']);

		expect(store.buildingIds).toEqual(new Set([7, 9]));
		expect(getJSONFetch).not.toHaveBeenCalled();
	});

	test('falls back to the rooms API and skips rooms without a building', async () => {
		getJSONFetch.mockImplementation(async (url: string) =>
			url.includes('ICB%2012') || url.includes('ICB 12')
				? { data: { buildingId: 4 } }
				: { data: { buildingId: null } }
		);

		const store = new PlannerBuildingsStore();
		await store.load(['ICB 12', 'ORPHAN 1']);

		expect(store.buildingIds).toEqual(new Set([4]));
		expect(getJSONFetch).toHaveBeenCalledWith(`/api/rooms?code=${encodeURIComponent('ICB 12')}`);
	});

	test('caches resolved rooms across loads', async () => {
		getLocalRoomByCode.mockResolvedValue({ buildingId: 3 });

		const store = new PlannerBuildingsStore();
		await store.load(['NL']);
		await store.load(['NL']);

		expect(getLocalRoomByCode).toHaveBeenCalledTimes(1);
		expect(store.buildingIds).toEqual(new Set([3]));
	});

	test('does not cache failures so a later load can retry', async () => {
		getJSONFetch.mockRejectedValueOnce(new Error('offline'));

		const store = new PlannerBuildingsStore();
		await store.load(['NL']);
		expect(store.buildingIds).toEqual(new Set());

		getJSONFetch.mockResolvedValueOnce({ data: { buildingId: 5 } });
		await store.load(['NL']);
		expect(store.buildingIds).toEqual(new Set([5]));
	});
});
