import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../travel-graph/load", () => ({
  loadTravelGraph: async () => ({}),
}));
const plan = vi.hoisted(() => ({ journeys: [] as unknown[] }));
vi.mock("../travel-graph/plan-multi-leg", () => ({
  planMultiLegJourneys: () => ({ journeys: plan.journeys, status: "ok" }),
}));

import { DirectionsStore } from "./directions-store.svelte";

const library = { lat: 14.1648, lng: 121.2417, label: "Main Library" };
const pin = { lat: 14.16, lng: 121.24, label: "Dropped pin", dropped: true };
const gps = { lat: 14.161, lng: 121.241, label: "Your location" };

describe("DirectionsStore start point", () => {
  let store: DirectionsStore;
  beforeEach(() => {
    store = new DirectionsStore();
    plan.journeys = [];
  });

  test("Directions from here waits for a destination, then plans", async () => {
    store.openFrom(pin);
    expect(store.active).toBe(true);
    expect(store.originFixed).toBe(true);
    expect(store.picking).toBe("destination");
    expect(store.takePick(library)).toBe(true);
    await vi.waitFor(() => expect(store.phase).toBe("ready"));
    expect(store.origin).toEqual(pin);
    expect(store.destination).toEqual(library);
    expect(store.picking).toBeNull();
  });

  test("picking a start point replaces the GPS origin and pins it", async () => {
    await store.open(library, gps);
    expect(store.originFixed).toBe(false);
    store.beginPick("origin");
    expect(store.takePick(pin)).toBe(true);
    await vi.waitFor(() => expect(store.origin).toEqual(pin));
    expect(store.originFixed).toBe(true);
    expect(store.destination).toEqual(library);

    // "Use my location" before a GPS fix clears the old plan.
    store.journeys = [{ id: "stale" } as never];
    await store.setOrigin(null, false);
    expect(store.journeys).toEqual([]);
    expect(store.phase).toBe("planning");

    // Once a fix exists the origin goes back to GPS.
    await store.setOrigin(gps, false);
    expect(store.originFixed).toBe(false);
  });

  test("takePick falls through to add-stop, and to nothing when idle", async () => {
    expect(store.takePick(pin)).toBe(false);
    await store.open(library, gps);
    expect(store.takePick(pin)).toBe(false);
    store.beginAddStop();
    expect(store.takePick(pin)).toBe(true);
    await vi.waitFor(() => expect(store.waypoints).toHaveLength(1));
  });

  test("close clears the chosen start point", () => {
    store.openFrom(pin);
    store.close();
    expect(store.originFixed).toBe(false);
    expect(store.picking).toBeNull();
    expect(store.origin).toBeNull();
  });
});

// Ranked fastest first, as planMultiLegJourneys returns them.
const jeep = { id: "forestry", kind: "transit", seconds: 300, legs: [] };
const walk = { id: "walk", kind: "walk", seconds: 600, legs: [] };

describe("DirectionsStore GMaps controls", () => {
  let store: DirectionsStore;
  beforeEach(() => {
    store = new DirectionsStore();
    plan.journeys = [jeep, walk];
  });

  test("home Directions starts at GPS and asks where to", () => {
    store.openEmpty(gps);
    expect(store.active).toBe(true);
    expect(store.origin).toEqual(gps);
    expect(store.originFixed).toBe(false);
    expect(store.picking).toBe("destination");
  });

  test("defaults to the fastest option and has a tab per mode", async () => {
    await store.open(library, gps);
    expect(store.selected?.id).toBe("forestry");
    expect(store.fastestId).toBe("forestry");
    expect(store.modes).toEqual([
      { mode: "walk", seconds: 600 },
      { mode: "transit", seconds: 300 },
    ]);
    store.selectMode("walk");
    expect(store.mode).toBe("walk");
    // A replan keeps the chosen tab.
    await store.refresh();
    expect(store.selected?.id).toBe("walk");
  });

  test("swap trades the ends and pins the old end as the start", async () => {
    await store.open(library, gps);
    await store.swap();
    expect(store.origin).toEqual(library);
    expect(store.originFixed).toBe(true);
    expect(store.destination).toEqual(gps);
  });

  test("swap with no destination asks for one again", async () => {
    store.openFrom(pin);
    await store.swap();
    expect(store.origin).toBeNull();
    expect(store.destination).toEqual(pin);
    expect(store.picking).toBe("origin");
    expect(store.journeys).toEqual([]);
  });

  test("getSnapshot round-trips through restore", async () => {
    await store.open(library, pin);
    store.originFixed = true;
    store.waypoints = [gps];
    store.selectMode("walk");
    store.startNavigation();
    const snapshot = store.getSnapshot();
    expect(snapshot).toEqual({
      origin: pin,
      originFixed: true,
      destination: library,
      waypoints: [gps],
      mode: "walk",
      navigating: true,
    });

    const other = new DirectionsStore();
    await other.restore(JSON.parse(JSON.stringify(snapshot)));
    expect(other.getSnapshot()).toEqual(snapshot);
    expect(other.phase).toBe("ready");
  });
});
