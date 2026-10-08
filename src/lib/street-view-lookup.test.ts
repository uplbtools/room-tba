import { beforeEach, describe, expect, test } from "bun:test";
import {
  bearingDegrees,
  headingToward,
  lookupStreetView,
  resetStreetViewLookupCache,
} from "@lib/street-view-lookup";

// bun test has no Web Storage; a Map is enough for the cache.
const stored = new Map<string, string>();
globalThis.localStorage = {
  getItem: (key: string) => stored.get(key) ?? null,
  setItem: (key: string, value: string) => void stored.set(key, value),
  removeItem: (key: string) => void stored.delete(key),
  clear: () => stored.clear(),
  key: () => null,
  length: 0,
} as Storage;

const PLACE = { lat: 14.165, lng: 121.242 };

function metadataFetch(body: unknown) {
  const calls: string[] = [];
  const impl = (async (url: string) => {
    calls.push(String(url));
    return new Response(JSON.stringify(body), { status: 200 });
  }) as unknown as typeof fetch;
  return { impl, calls };
}

describe("bearingDegrees", () => {
  test("cardinal directions", () => {
    expect(bearingDegrees(PLACE, { lat: 14.166, lng: 121.242 })).toBe(0);
    expect(bearingDegrees(PLACE, { lat: 14.165, lng: 121.243 })).toBe(90);
    expect(bearingDegrees(PLACE, { lat: 14.164, lng: 121.242 })).toBe(180);
    expect(bearingDegrees(PLACE, { lat: 14.165, lng: 121.241 })).toBe(270);
  });

  test("diagonal stays in 0-359", () => {
    const ne = bearingDegrees(PLACE, { lat: 14.166, lng: 121.243 });
    expect(ne).toBeGreaterThan(40);
    expect(ne).toBeLessThan(50);
    const nw = bearingDegrees(PLACE, { lat: 14.166, lng: 121.241 });
    expect(nw).toBeGreaterThan(310);
    expect(nw).toBeLessThan(320);
  });
});

describe("headingToward", () => {
  test("points from the pano to the place", () => {
    // Pano 50 m south of the place looks north.
    expect(headingToward({ lat: 14.16455, lng: 121.242 }, PLACE)).toBe(0);
  });

  test("no heading when the pano sits on the place", () => {
    expect(headingToward({ lat: 14.16501, lng: 121.242 }, PLACE)).toBe(
      undefined,
    );
  });
});

describe("lookupStreetView", () => {
  beforeEach(() => {
    resetStreetViewLookupCache();
    localStorage.clear();
  });

  test("OK metadata becomes a pinned pano aimed at the place, once", async () => {
    const { impl, calls } = metadataFetch({
      status: "OK",
      pano_id: "abc",
      location: { lat: 14.165, lng: 121.2415 },
      date: "2024-03",
      copyright: "© Google",
    });
    const pano = await lookupStreetView(PLACE, "test-google-key", impl);
    expect(pano).toEqual({
      panoId: "abc",
      heading: 90,
      copyright: "© Google",
      date: "2024-03",
    });
    const url = new URL(calls[0]!);
    expect(url.pathname).toEndWith("/streetview/metadata");
    expect(url.searchParams.get("source")).toBe("outdoor");
    expect(url.searchParams.get("radius")).toBe("100");

    // Same pin again: memory cache, no second request.
    await lookupStreetView(PLACE, "test-google-key", impl);
    expect(calls).toHaveLength(1);

    // New session: localStorage cache, still no request.
    resetStreetViewLookupCache();
    expect(await lookupStreetView(PLACE, "test-google-key", impl)).toEqual(
      pano,
    );
    expect(calls).toHaveLength(1);
  });

  test("no coverage is cached as null", async () => {
    const { impl, calls } = metadataFetch({ status: "ZERO_RESULTS" });
    expect(await lookupStreetView(PLACE, "test-google-key", impl)).toBeNull();
    resetStreetViewLookupCache();
    expect(await lookupStreetView(PLACE, "test-google-key", impl)).toBeNull();
    expect(calls).toHaveLength(1);
  });

  test("errors resolve null without persisting", async () => {
    const { impl, calls } = metadataFetch({
      status: "REQUEST_DENIED",
      error_message: "bad key",
    });
    expect(await lookupStreetView(PLACE, "test-google-key", impl)).toBeNull();
    resetStreetViewLookupCache();
    await lookupStreetView(PLACE, "test-google-key", impl);
    expect(calls).toHaveLength(2);
  });
});
