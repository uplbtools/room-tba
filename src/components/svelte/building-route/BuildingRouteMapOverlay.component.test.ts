import { render, waitFor } from "@testing-library/svelte";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { BuildingWalkRoute } from "@lib/travel-graph/building-route";

const { map, mapStore, buildingRouteStore, sources, layers } = vi.hoisted(
  () => {
    const sources = new Map<string, { setData: ReturnType<typeof vi.fn> }>();
    const layers = new Set<string>();
    const map = {
      isStyleLoaded: vi.fn(() => true),
      getSource: vi.fn((id: string) => sources.get(id)),
      addSource: vi.fn((id: string) => {
        sources.set(id, { setData: vi.fn() });
      }),
      removeSource: vi.fn((id: string) => {
        sources.delete(id);
      }),
      getLayer: vi.fn((id: string) => (layers.has(id) ? { id } : undefined)),
      addLayer: vi.fn((layer: { id: string }) => {
        layers.add(layer.id);
      }),
      removeLayer: vi.fn((id: string) => {
        layers.delete(id);
      }),
      getContainer: vi.fn(() => ({
        getBoundingClientRect: () => ({
          top: 0,
          right: 1000,
          bottom: 800,
          left: 0,
          width: 1000,
          height: 800,
        }),
      })),
      fitBounds: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    };
    return {
      sources,
      layers,
      map,
      mapStore: { mapInstance: map },
      buildingRouteStore: {
        route: null as BuildingWalkRoute | null,
        origin: null as { id: number } | null,
        destination: null as { id: number } | null,
      },
    };
  },
);

vi.mock("@lib/store.svelte", () => ({ mapStore, buildingRouteStore }));

vi.mock("maplibre-gl", () => ({
  LngLatBounds: class {
    coordinates: [number, number][] = [];
    extend(coordinate: [number, number]) {
      this.coordinates.push(coordinate);
      return this;
    }
    isEmpty() {
      return this.coordinates.length === 0;
    }
  },
}));

import BuildingRouteMapOverlay from "./BuildingRouteMapOverlay.svelte";

const route: BuildingWalkRoute = {
  graphMeters: 200,
  graphSeconds: 160,
  originConnectorMeters: 25,
  destinationConnectorMeters: 25,
  totalMeters: 250,
  totalSeconds: 200,
  graphCoordinates: [
    [121.24, 14.16],
    [121.241, 14.161],
  ],
  originConnectorCoordinates: [
    [121.2398, 14.1598],
    [121.24, 14.16],
  ],
  destinationConnectorCoordinates: [
    [121.241, 14.161],
    [121.2412, 14.1612],
  ],
};

describe("BuildingRouteMapOverlay", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sources.clear();
    layers.clear();
    buildingRouteStore.route = route;
    buildingRouteStore.origin = { id: 31 };
    buildingRouteStore.destination = { id: 35 };
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn(() => ({ matches: false })),
    });
  });

  test("draws connectors below a cased authoritative route and restores on style.load", async () => {
    const { unmount } = render(BuildingRouteMapOverlay);

    await waitFor(() => expect(map.addSource).toHaveBeenCalledTimes(2));
    expect(map.addLayer).toHaveBeenCalledTimes(3);
    expect(map.addLayer.mock.calls.map(([layer]) => layer.id)).toEqual([
      "building-walk-route-connectors",
      "building-walk-route-graph-casing",
      "building-walk-route-graph",
    ]);

    const connector = map.addLayer.mock.calls[0]?.[0] as {
      paint?: Record<string, unknown>;
    };
    const casing = map.addLayer.mock.calls[1]?.[0] as {
      paint?: Record<string, unknown>;
    };
    const graph = map.addLayer.mock.calls[2]?.[0] as {
      paint?: Record<string, unknown>;
    };
    expect(connector.paint).toMatchObject({
      "line-color": "#71717a",
      "line-width": 2,
      "line-opacity": 0.56,
      "line-dasharray": [1, 1.5],
    });
    expect(casing.paint).toMatchObject({
      "line-color": "#ffffff",
      "line-width": 8,
    });
    expect(graph.paint).toMatchObject({
      "line-color": "#8d1437",
      "line-width": 5,
    });

    expect(map.fitBounds).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ animate: true, duration: 650, maxZoom: 18 }),
    );
    expect(map.on).toHaveBeenCalledWith("style.load", expect.any(Function));

    const styleLoad = map.on.mock.calls.find(
      ([event]) => event === "style.load",
    )?.[1] as (() => void) | undefined;
    expect(styleLoad).toBeDefined();

    sources.clear();
    layers.clear();
    styleLoad?.();
    expect(map.addSource).toHaveBeenCalledTimes(4);
    expect(map.addLayer).toHaveBeenCalledTimes(6);

    unmount();
    expect(map.off).toHaveBeenCalledWith("style.load", expect.any(Function));
    expect(map.removeLayer).toHaveBeenCalledTimes(3);
    expect(map.removeSource).toHaveBeenCalledTimes(2);
  });

  test("disables camera animation when reduced motion is requested", async () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn(() => ({ matches: true })),
    });

    render(BuildingRouteMapOverlay);
    await waitFor(() => expect(map.fitBounds).toHaveBeenCalled());
    expect(map.fitBounds).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ animate: false, duration: 0 }),
    );
  });
});
