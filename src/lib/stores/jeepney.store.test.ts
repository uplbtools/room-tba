import { beforeEach, describe, expect, test } from "vitest";
import {
  buildingTypeFilter,
  jeepneyStore,
  mapToolsStore,
  modalStore,
} from "@lib/store.svelte";

describe("JeepneyStore", () => {
  beforeEach(() => {
    jeepneyStore.disableLayer();
    mapToolsStore.close();
    buildingTypeFilter.set("class-building");
  });

  test("enableLayer activates routes and closes map tools", () => {
    mapToolsStore.toggle();
    jeepneyStore.enableLayer();
    expect(jeepneyStore.layerActive).toBe(true);
    expect(mapToolsStore.open).toBe(false);
  });

  test("enableLayer resets building filter to all", () => {
    buildingTypeFilter.set("up-managed-dorm");
    jeepneyStore.enableLayer();
    expect(buildingTypeFilter.value).toBe("all");
  });

  test("selectRoute toggles selected route id", () => {
    jeepneyStore.enableLayer();
    jeepneyStore.selectRoute("route-a");
    expect(jeepneyStore.selectedRouteId).toBe("route-a");
    jeepneyStore.selectRoute("route-a");
    expect(jeepneyStore.selectedRouteId).toBeNull();
  });

  test("disableLayer clears route and stop state", () => {
    jeepneyStore.enableLayer();
    jeepneyStore.selectRoute("route-a");
    jeepneyStore.openStop(0);
    jeepneyStore.disableLayer();
    expect(jeepneyStore.layerActive).toBe(false);
    expect(jeepneyStore.selectedRouteId).toBeNull();
    expect(jeepneyStore.selectedStopIndex).toBeNull();
  });

  test("openRouteModal sets the modal route and opens the jeepney modal", () => {
    modalStore.closeModal();
    jeepneyStore.openRouteModal("route-b");
    expect(jeepneyStore.modalRouteId).toBe("route-b");
    expect(modalStore.open).toBe(true);
    expect(modalStore.type).toBe("jeepney-route");
    modalStore.closeModal();
  });

  test("openRouteOnMap selects the route without toggling it off", () => {
    jeepneyStore.disableLayer();
    jeepneyStore.openRouteOnMap("route-c");
    expect(jeepneyStore.layerActive).toBe(true);
    expect(jeepneyStore.selectedRouteId).toBe("route-c");
    // Unlike selectRoute, a repeat call keeps the route selected (no toggle).
    jeepneyStore.openRouteOnMap("route-c");
    expect(jeepneyStore.selectedRouteId).toBe("route-c");
  });
});
