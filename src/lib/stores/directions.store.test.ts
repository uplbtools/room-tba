import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../travel-graph/load", () => ({
  loadTravelGraph: async () => ({}),
}));
vi.mock("../travel-graph/plan-multi-leg", () => ({
  planMultiLegJourneys: () => ({ journeys: [], status: "ok" }),
}));

import { DirectionsStore } from "./directions-store.svelte";

const library = { lat: 14.1648, lng: 121.2417, label: "Main Library" };
const pin = { lat: 14.16, lng: 121.24, label: "Dropped pin", dropped: true };
const gps = { lat: 14.161, lng: 121.241, label: "Your location" };

describe("DirectionsStore start point", () => {
  let store: DirectionsStore;
  beforeEach(() => {
    store = new DirectionsStore();
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
