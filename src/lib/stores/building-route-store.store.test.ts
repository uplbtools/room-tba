import { beforeEach, describe, expect, test, vi } from "vitest";
import type { TravelGraph } from "../travel-graph/engine";

const { loadTravelGraph } = vi.hoisted(() => ({ loadTravelGraph: vi.fn() }));
vi.mock("../travel-graph/load", () => ({ loadTravelGraph }));

import { BuildingRouteStore } from "./building-route-store.svelte";

const graph: TravelGraph = {
  coordScale: 1e6,
  lat: new Float64Array([14.16, 14.161]),
  lng: new Float64Array([121.24, 121.241]),
  edges: [[0, 1, 100, "footway", null, []]],
  adjacency: [[{ edge: 0, to: 1 }], [{ edge: 0, to: 0 }]],
};

const a = { id: 1, buildingName: "A", lat: 14.16, lon: 121.24 };
const b = { id: 2, buildingName: "B", lat: 14.161, lon: 121.241 };

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe("BuildingRouteStore", () => {
  beforeEach(() => vi.clearAllMocks());

  test("plans once both buildings are selected", async () => {
    loadTravelGraph.mockResolvedValue(graph);
    const store = new BuildingRouteStore();
    store.open();
    await store.setOrigin(a);
    expect(store.phase).toBe("selecting");
    await store.setDestination(b);
    expect(store.phase).toBe("ready");
    expect(store.result?.status).toBe("ok");
    expect(store.route?.totalMeters).toBeCloseTo(100);
  });

  test("clear invalidates an in-flight plan so stale results cannot land", async () => {
    const loading = deferred<TravelGraph>();
    loadTravelGraph.mockReturnValue(loading.promise);
    const store = new BuildingRouteStore();
    store.open();
    store.origin = a;
    store.destination = b;
    const planning = store.refresh();
    expect(store.phase).toBe("planning");

    store.clearDestination();
    loading.resolve(graph);
    await planning;

    expect(store.destination).toBeNull();
    expect(store.result).toBeNull();
    expect(store.phase).toBe("selecting");
  });

  test("swap clears stale geometry and replans the reversed pair", async () => {
    loadTravelGraph.mockResolvedValue(graph);
    const store = new BuildingRouteStore();
    store.open();
    await store.setOrigin(a);
    await store.setDestination(b);
    await store.swap();

    expect(store.origin?.id).toBe(2);
    expect(store.destination?.id).toBe(1);
    expect(store.result?.originBuildingId).toBe(2);
    expect(store.result?.destinationBuildingId).toBe(1);
  });

  test("close invalidates in-flight planning and resets the session", async () => {
    const loading = deferred<TravelGraph>();
    loadTravelGraph.mockReturnValue(loading.promise);
    const store = new BuildingRouteStore();
    store.open();
    store.origin = a;
    store.destination = b;
    const planning = store.refresh();
    store.close();
    loading.resolve(graph);
    await planning;

    expect(store.phase).toBe("idle");
    expect(store.origin).toBeNull();
    expect(store.destination).toBeNull();
    expect(store.result).toBeNull();
  });

  test("graph load failure exposes an error state without stale route data", async () => {
    loadTravelGraph.mockRejectedValue(new Error("offline cache miss"));
    const store = new BuildingRouteStore();
    store.open();
    store.origin = a;
    store.destination = b;

    await store.refresh();

    expect(store.phase).toBe("error");
    expect(store.result).toBeNull();
    expect(store.route).toBeNull();
  });

  test("same-building selection is ready but never invents an outdoor route", async () => {
    loadTravelGraph.mockResolvedValue(graph);
    const store = new BuildingRouteStore();
    store.open();
    await store.setOrigin(a);
    await store.setDestination({ ...a });

    expect(store.phase).toBe("ready");
    expect(store.result?.status).toBe("same-building");
    expect(store.route).toBeNull();
  });

  test("newer selection wins when an older graph load resolves last", async () => {
    const first = deferred<TravelGraph>();
    loadTravelGraph.mockReturnValueOnce(first.promise).mockResolvedValue(graph);
    const store = new BuildingRouteStore();
    store.open();
    store.origin = a;
    store.destination = b;
    const stale = store.refresh();

    const c = { id: 3, buildingName: "C", lat: 14.16, lon: 121.24 };
    await store.setOrigin(c);
    expect(store.result?.originBuildingId).toBe(3);

    first.resolve(graph);
    await stale;
    expect(store.result?.originBuildingId).toBe(3);
    expect(store.origin?.id).toBe(3);
  });
});
