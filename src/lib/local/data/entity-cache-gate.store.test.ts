import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { BuildingData } from "@lib/types";

const query = vi.fn();

/** Controls whether the offline cache is hydrated for the call under test. */
let cacheReady = false;
/** The PGlite handle; left pending to stand in for a wasm download in flight. */
let dbHandle: Promise<unknown> = new Promise(() => {});

vi.mock("./pgliteDB", () => ({
  getDB: () => dbHandle,
  isLocalCacheReady: () => cacheReady,
}));

import { getBuildings } from "./utils";

const REMOTE: BuildingData[] = [
  {
    id: 1,
    buildingName: "Physical Sciences",
    lon: 121,
    lat: 14,
    directions: null,
    buildingType: "academic",
    imageUrl: null,
    crFacilities: null,
    version: 1,
    updatedAt: "2026-08-04T00:00:00.000Z",
  } as BuildingData,
];

const realFetch = globalThis.fetch;

/** Fails the test rather than hanging it if PGlite is back on the boot path. */
function withinBudget<T>(work: Promise<T>, ms = 1000): Promise<T> {
  return Promise.race([
    work,
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error("boot load blocked on PGlite hydration")),
        ms,
      ),
    ),
  ]);
}

beforeEach(() => {
  query.mockReset();
  cacheReady = false;
  dbHandle = new Promise(() => {});
  globalThis.fetch = vi.fn(
    async () =>
      new Response(JSON.stringify(REMOTE), {
        headers: { "content-type": "application/json" },
      }),
  ) as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("campus load while the offline cache is still hydrating (#866)", () => {
  test("a first visit serves remote rows without waiting for PGlite", async () => {
    const result = await withinBudget(
      getBuildings({ valid: false, newKey: "buildings-key" }),
    );

    expect(result.source).toBe("remote");
    expect(result.rows).toEqual(REMOTE);
    // The cache is empty on a first visit; reading it would only have bought
    // a ~5 MB wasm download in front of the fetch.
    expect(query).not.toHaveBeenCalled();
  });

  test("a hydrated cache with a matching sync key still short-circuits the fetch", async () => {
    cacheReady = true;
    dbHandle = Promise.resolve({ waitReady: Promise.resolve(), query });
    query.mockResolvedValue({ rows: REMOTE });

    const result = await withinBudget(
      getBuildings({ valid: true, newKey: "buildings-key" }),
    );

    expect(result.source).toBe("cache");
    expect(result.rows).toEqual(REMOTE);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  test("offline still falls back to the cache once it is hydrated", async () => {
    cacheReady = true;
    dbHandle = Promise.resolve({ waitReady: Promise.resolve(), query });
    query.mockResolvedValue({ rows: REMOTE });

    const result = await withinBudget(
      getBuildings({ valid: false, newKey: null }),
    );

    expect(result.source).toBe("cache");
    expect(result.rows).toEqual(REMOTE);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
