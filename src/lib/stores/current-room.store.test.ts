import { beforeEach, describe, expect, test, vi } from "vitest";
import type { RoomData } from "@lib/types";

const { getJSONFetch, getLocalRoomByCode, isLocalCacheReady } = vi.hoisted(
  () => ({
    getJSONFetch: vi.fn(),
    getLocalRoomByCode: vi.fn(),
    isLocalCacheReady: vi.fn(() => true),
  }),
);

vi.mock("../local/data/pgliteDB.js", () => ({ isLocalCacheReady }));

vi.mock("../local/data/utils.js", () => ({
  getJSONFetch,
  getLocalRoomByCode,
  getBuildingIdsWithClasses: vi.fn(),
  getLocalClassesForRoom: vi.fn(),
  getLocalBuildingRooms: vi.fn(),
}));

import { currentRoom } from "./index.svelte.js";

const room = (roomCode: string): RoomData =>
  ({ id: 1, roomCode, buildingId: 1 }) as unknown as RoomData;

/** Resolves only when the returned trigger is called. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe("currentRoom.notFound", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isLocalCacheReady.mockReturnValue(true);
    currentRoom.setRoom(room("RESET"));
  });

  test("stays false while a lookup is in flight, so panels show loading", async () => {
    const local = deferred<RoomData | null>();
    getLocalRoomByCode.mockReturnValue(local.promise);

    const lookup = currentRoom.getRoomByCode("E2E-101");
    expect(currentRoom.value).toBeNull();
    expect(currentRoom.notFound).toBe(false);

    local.resolve(room("E2E-101"));
    await lookup;
    expect(currentRoom.notFound).toBe(false);
    expect(currentRoom.value?.roomCode).toBe("E2E-101");
  });

  test("is true only after a completed lookup found nothing", async () => {
    getLocalRoomByCode.mockResolvedValue(null);
    getJSONFetch.mockResolvedValue({ data: null });

    await currentRoom.getRoomByCode("NOPE");

    expect(currentRoom.value).toBeNull();
    expect(currentRoom.notFound).toBe(true);
  });

  test("a failed lookup does not leave a stale notFound behind", async () => {
    getLocalRoomByCode.mockResolvedValue(null);
    getJSONFetch.mockRejectedValue(new Error("offline"));
    await currentRoom.getRoomByCode("NOPE");
    expect(currentRoom.notFound).toBe(true);

    currentRoom.setRoom(room("FOUND"));
    expect(currentRoom.notFound).toBe(false);

    await currentRoom.getRoomFromSearch(room("ALSO-FOUND"));
    expect(currentRoom.notFound).toBe(false);
  });

  test("a slow earlier lookup cannot overwrite a newer result", async () => {
    const slow = deferred<RoomData | null>();
    getLocalRoomByCode.mockReturnValueOnce(slow.promise);
    const stale = currentRoom.getRoomByCode("SLOW");

    getLocalRoomByCode.mockResolvedValueOnce(room("FAST"));
    await currentRoom.getRoomByCode("FAST");
    expect(currentRoom.value?.roomCode).toBe("FAST");

    // The first lookup finally resolves with a miss; it must not win.
    slow.resolve(null);
    await stale;

    expect(currentRoom.value?.roomCode).toBe("FAST");
    expect(currentRoom.notFound).toBe(false);
  });
});

describe("currentRoom.getRoomByCode with a cold local cache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isLocalCacheReady.mockReturnValue(false);
    currentRoom.setRoom(room("RESET"));
  });

  test("asks the network first instead of booting the cache (deep-link skeleton)", async () => {
    getJSONFetch.mockResolvedValue({ data: room("PS 105") });

    await currentRoom.getRoomByCode("PS 105");

    expect(getLocalRoomByCode).not.toHaveBeenCalled();
    expect(currentRoom.value?.roomCode).toBe("PS 105");
  });

  test("falls back to the cache when offline", async () => {
    getJSONFetch.mockRejectedValue(new Error("offline"));
    getLocalRoomByCode.mockResolvedValue(room("PS 105"));

    await currentRoom.getRoomByCode("PS 105");

    expect(currentRoom.value?.roomCode).toBe("PS 105");
    expect(currentRoom.notFound).toBe(false);
  });
});
