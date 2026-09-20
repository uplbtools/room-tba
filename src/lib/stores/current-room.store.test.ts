import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { Room } from '$lib/utils/types.js';

const { getJSONFetch, getLocalRoomByCode } = vi.hoisted(() => ({
	getJSONFetch: vi.fn(),
	getLocalRoomByCode: vi.fn()
}));

vi.mock('../utils/local/data/utils.js', () => ({
	getJSONFetch,
	getLocalRoomByCode,
	getBuildingIdsWithClasses: vi.fn(),
	getLocalClassesForRoom: vi.fn(),
	getLocalBuildingRooms: vi.fn()
}));

import { currentRoom } from './index.svelte.js';

const room = (code: string): Room => ({ id: 1, code, buildingId: 1 }) as unknown as Room;

/** Resolves only when the returned trigger is called. */
function deferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((r) => {
		resolve = r;
	});
	return { promise, resolve };
}

describe('currentRoom.notFound', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		currentRoom.setRoom(room('RESET'));
	});

	test('stays false while a lookup is in flight, so panels show loading', async () => {
		const local = deferred<Room | null>();
		getLocalRoomByCode.mockReturnValue(local.promise);

		const lookup = currentRoom.getRoomByCode('E2E-101');
		expect(currentRoom.value).toBeNull();
		expect(currentRoom.notFound).toBe(false);

		local.resolve(room('E2E-101'));
		await lookup;
		expect(currentRoom.notFound).toBe(false);
		expect(currentRoom.value?.code).toBe('E2E-101');
	});

	test('is true only after a completed lookup found nothing', async () => {
		getLocalRoomByCode.mockResolvedValue(null);
		getJSONFetch.mockResolvedValue({ data: null });

		await currentRoom.getRoomByCode('NOPE');

		expect(currentRoom.value).toBeNull();
		expect(currentRoom.notFound).toBe(true);
	});

	test('a failed lookup does not leave a stale notFound behind', async () => {
		getLocalRoomByCode.mockResolvedValue(null);
		getJSONFetch.mockRejectedValue(new Error('offline'));
		await currentRoom.getRoomByCode('NOPE');
		expect(currentRoom.notFound).toBe(true);

		currentRoom.setRoom(room('FOUND'));
		expect(currentRoom.notFound).toBe(false);

		await currentRoom.getRoomFromSearch(room('ALSO-FOUND'));
		expect(currentRoom.notFound).toBe(false);
	});

	test('a slow earlier lookup cannot overwrite a newer result', async () => {
		const slow = deferred<Room | null>();
		getLocalRoomByCode.mockReturnValueOnce(slow.promise);
		const stale = currentRoom.getRoomByCode('SLOW');

		getLocalRoomByCode.mockResolvedValueOnce(room('FAST'));
		await currentRoom.getRoomByCode('FAST');
		expect(currentRoom.value?.code).toBe('FAST');

		// The first lookup finally resolves with a miss; it must not win.
		slow.resolve(null);
		await stale;

		expect(currentRoom.value?.code).toBe('FAST');
		expect(currentRoom.notFound).toBe(false);
	});
});
