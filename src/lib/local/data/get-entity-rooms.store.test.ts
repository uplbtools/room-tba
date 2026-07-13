import { afterEach, describe, expect, test } from "vitest";
import type { RoomData } from "@lib/types";
import { getEntityRooms } from "./utils";

const realFetch = globalThis.fetch;

function mockFetch(body: unknown, status = 200) {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify(body), { status })) as typeof fetch;
}

afterEach(() => {
  globalThis.fetch = realFetch;
});

const sampleRoom = (id: number): RoomData =>
  ({
    id,
    code: `R-${id}`,
    directions: null,
    buildingId: 1,
    collegeId: null,
    divisionId: null,
    category: null,
    version: 1,
    updatedAt: null,
  }) as RoomData;

describe("getEntityRooms", () => {
  test("returns cached rows without hitting the API when PGlite has data (#415)", async () => {
    let fetchCalled = false;
    globalThis.fetch = (async () => {
      fetchCalled = true;
      return new Response("{}", { status: 200 });
    }) as typeof fetch;

    const load = getEntityRooms("building", async () => [sampleRoom(1)]);
    const rooms = await load(false, 9);
    expect(rooms).toHaveLength(1);
    expect(fetchCalled).toBe(false);
  });

  test("fetches remote when cache is empty and sync is invalid", async () => {
    mockFetch({ data: [sampleRoom(2)] });
    const load = getEntityRooms("building", async () => []);
    const rooms = await load(false, 9);
    expect(rooms).toHaveLength(1);
    expect(rooms[0]?.id).toBe(2);
  });

  test("returns empty cache when sync is valid and PGlite has no rows", async () => {
    let fetchCalled = false;
    globalThis.fetch = (async () => {
      fetchCalled = true;
      return new Response("{}", { status: 200 });
    }) as typeof fetch;

    const load = getEntityRooms("college", async () => []);
    const rooms = await load(true, 3);
    expect(rooms).toEqual([]);
    expect(fetchCalled).toBe(false);
  });
});
