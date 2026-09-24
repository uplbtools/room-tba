import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, test, vi } from "vitest";

const { buildingRouteStore, directionsStore, locationStore } = vi.hoisted(
  () => ({
    buildingRouteStore: { close: vi.fn() },
    directionsStore: {
      active: false,
      addingStop: false,
      addWaypoint: vi.fn(),
      open: vi.fn(),
    },
    locationStore: {
      coords: null as [number, number] | null,
      requestLocation: vi.fn(),
    },
  }),
);

vi.mock("@lib/store.svelte", () => ({
  buildingRouteStore,
  directionsStore,
  locationStore,
}));

import EntityDirectionsChip from "./EntityDirectionsChip.svelte";

describe("EntityDirectionsChip building-route exclusivity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    directionsStore.active = false;
    directionsStore.addingStop = false;
    locationStore.coords = null;
  });

  test("ordinary directions closes the building router before requesting GPS", async () => {
    render(EntityDirectionsChip, {
      props: {
        lat: 14.167,
        lon: 121.2426,
        destinationLabel: "CDC Building",
      },
    });

    await fireEvent.click(
      screen.getByRole("button", { name: "Get directions to CDC Building" }),
    );

    expect(buildingRouteStore.close).toHaveBeenCalledOnce();
    expect(locationStore.requestLocation).toHaveBeenCalledOnce();
    expect(directionsStore.open).toHaveBeenCalledWith(
      { lat: 14.167, lng: 121.2426, label: "CDC Building" },
      null,
    );
    const closeOrder = buildingRouteStore.close.mock.invocationCallOrder[0];
    const gpsOrder = locationStore.requestLocation.mock.invocationCallOrder[0];
    expect(closeOrder).toBeDefined();
    expect(gpsOrder).toBeDefined();
    expect(closeOrder as number).toBeLessThan(gpsOrder as number);
  });

  test("adding a waypoint preserves the existing directions flow", async () => {
    directionsStore.active = true;
    directionsStore.addingStop = true;

    render(EntityDirectionsChip, {
      props: {
        lat: 14.167,
        lon: 121.2426,
        destinationLabel: "CDC Building",
      },
    });

    await fireEvent.click(
      screen.getByRole("button", { name: "Add CDC Building as a stop" }),
    );

    expect(directionsStore.addWaypoint).toHaveBeenCalledWith({
      lat: 14.167,
      lng: 121.2426,
      label: "CDC Building",
    });
    expect(buildingRouteStore.close).not.toHaveBeenCalled();
    expect(locationStore.requestLocation).not.toHaveBeenCalled();
    expect(directionsStore.open).not.toHaveBeenCalled();
  });
});
