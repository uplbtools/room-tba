import { beforeEach, describe, expect, test } from "vitest";
import { queryStore } from "@lib/store.svelte";
import {
  RECENT_PLACES_KEY,
  RECENT_PLACES_LIMIT,
  SAVED_PLACES_KEY,
  isSavedPlace,
  openSavedPlace,
  recentPlaces,
  savedPlaces,
  upsertFront,
  type SavedPlace,
} from "./saved-places.svelte";

const psb = {
  category: "building",
  value: "Physical Sciences Building",
  label: "Physical Sciences Building",
  subtitle: "Class building",
  lat: 14.164,
  lon: 121.242,
} as const;

const room = {
  category: "room",
  value: "PS 105",
  label: "PS 105",
  subtitle: "Physical Sciences Building",
} as const;

function stored(key: string): SavedPlace[] {
  return JSON.parse(localStorage.getItem(key) ?? "[]");
}

describe("saved places store", () => {
  beforeEach(() => {
    localStorage.clear();
    savedPlaces.load();
    recentPlaces.load();
  });

  test("toggle saves, persists, and unsaves", () => {
    expect(savedPlaces.has("building", psb.value)).toBe(false);

    expect(savedPlaces.toggle(psb)).toBe(true);
    expect(savedPlaces.has("building", psb.value)).toBe(true);
    expect(stored(SAVED_PLACES_KEY)).toMatchObject([
      { category: "building", value: psb.value, lat: psb.lat },
    ]);

    expect(savedPlaces.toggle(psb)).toBe(false);
    expect(savedPlaces.has("building", psb.value)).toBe(false);
    expect(stored(SAVED_PLACES_KEY)).toEqual([]);
  });

  test("keys by category so a room and a building can share a name", () => {
    savedPlaces.save({ ...room, value: psb.value });
    expect(savedPlaces.has("room", psb.value)).toBe(true);
    expect(savedPlaces.has("building", psb.value)).toBe(false);
  });

  test("survives a reload from storage and drops corrupt rows", () => {
    localStorage.setItem(
      SAVED_PLACES_KEY,
      JSON.stringify([
        { ...psb, at: 1 },
        { category: "planet", value: "Mars", label: "Mars", at: 2 },
        "junk",
      ]),
    );
    savedPlaces.load();
    expect(savedPlaces.items.map((p) => p.value)).toEqual([psb.value]);
  });

  test("unparseable storage falls back to an empty list", () => {
    localStorage.setItem(SAVED_PLACES_KEY, "{not json");
    savedPlaces.load();
    expect(savedPlaces.items).toEqual([]);
  });

  test("recently viewed keeps the newest first, deduped, capped", () => {
    recentPlaces.record(psb);
    recentPlaces.record(room);
    recentPlaces.record(psb);
    expect(recentPlaces.items.map((p) => p.value)).toEqual([
      psb.value,
      room.value,
    ]);

    for (let i = 0; i < RECENT_PLACES_LIMIT + 5; i++) {
      recentPlaces.record({ ...room, value: `R${i}`, label: `R${i}` });
    }
    expect(recentPlaces.items).toHaveLength(RECENT_PLACES_LIMIT);
    expect(recentPlaces.items[0]?.value).toBe(`R${RECENT_PLACES_LIMIT + 4}`);
    expect(stored(RECENT_PLACES_KEY)).toHaveLength(RECENT_PLACES_LIMIT);
  });

  test("clear empties the list and storage", () => {
    recentPlaces.record(psb);
    recentPlaces.clear();
    expect(recentPlaces.items).toEqual([]);
    expect(stored(RECENT_PLACES_KEY)).toEqual([]);
  });

  test("openSavedPlace opens the sheet through the query", () => {
    openSavedPlace(room);
    expect(queryStore.category).toBe("room");
    expect(queryStore.queryValue).toBe("PS 105");
    expect(queryStore.inputValue).toBe("PS 105");
    queryStore.clearQuery();
  });
});

describe("saved place helpers", () => {
  test("upsertFront moves an existing entry to the front", () => {
    const a = { ...psb, at: 1 };
    const b = { ...room, at: 2 };
    expect(upsertFront([a, b], { ...b, at: 3 }, 10)).toEqual([
      { ...b, at: 3 },
      a,
    ]);
  });

  test("isSavedPlace rejects empty values and unknown categories", () => {
    expect(isSavedPlace({ ...psb, at: 1 })).toBe(true);
    expect(isSavedPlace({ ...psb, value: "", at: 1 })).toBe(false);
    expect(isSavedPlace({ ...psb, category: "event", at: 1 })).toBe(false);
    expect(isSavedPlace(null)).toBe(false);
  });
});
