import { beforeEach, describe, expect, test } from "vitest";
import { MapOverlayRegistry, type MapOverlay } from "./map-overlays.svelte";
import { APP_MAP_OVERLAYS, mapIsBare } from "../map-overlay-sources.svelte";
import {
  jeepneyStore,
  locationStore,
  mapToolsStore,
  mapViewStore,
  measureRouteStore,
  queryStore,
  scheduleRouteStore,
  sidePanelStore,
  sidebarStore,
  transitStore,
  travelTimeStore,
} from "../store.svelte";

function fake(id: string, kind: MapOverlay["kind"] = "route") {
  const state = { active: false, owner: false };
  const overlay: MapOverlay = {
    id,
    kind,
    label: () => id,
    isActive: () => state.active,
    ownerOpen: () => state.owner,
    clear: () => {
      state.active = false;
    },
  };
  return { overlay, state };
}

describe("MapOverlayRegistry", () => {
  let registry: MapOverlayRegistry;
  beforeEach(() => {
    registry = new MapOverlayRegistry();
  });

  test("lists active overlays in activation order", () => {
    const a = fake("a");
    const b = fake("b");
    registry.register(a.overlay);
    registry.register(b.overlay);
    b.state.active = true;
    expect(registry.active.map((o) => o.id)).toEqual(["b"]);
    a.state.active = true;
    expect(registry.active.map((o) => o.id)).toEqual(["b", "a"]);
  });

  test("stranded leaves out overlays whose panel is open", () => {
    const a = fake("a");
    const b = fake("b");
    registry.register(a.overlay);
    registry.register(b.overlay);
    a.state.active = b.state.active = true;
    a.state.owner = true;
    expect(registry.stranded.map((o) => o.id)).toEqual(["b"]);
    a.state.owner = false;
    expect(registry.stranded).toHaveLength(2);
  });

  test("clearMostRecent clears the newest first, then reports none", () => {
    const a = fake("a");
    const b = fake("b");
    registry.register(a.overlay);
    registry.register(b.overlay);
    a.state.active = true;
    void registry.active;
    b.state.active = true;
    void registry.active;
    expect(registry.clearMostRecent()).toBe(true);
    expect(b.state.active).toBe(false);
    expect(a.state.active).toBe(true);
    expect(registry.clearMostRecent()).toBe(true);
    expect(registry.clearMostRecent()).toBe(false);
  });

  test("a re-activated overlay becomes the most recent", () => {
    const a = fake("a");
    const b = fake("b");
    registry.register(a.overlay);
    registry.register(b.overlay);
    a.state.active = true;
    void registry.active;
    b.state.active = true;
    void registry.active;
    a.state.active = false;
    void registry.active;
    a.state.active = true;
    expect(registry.active.map((o) => o.id)).toEqual(["b", "a"]);
  });

  test("clearAll, clear by id and unregister", () => {
    const a = fake("a");
    const b = fake("b");
    const unregister = registry.register(a.overlay);
    registry.register(b.overlay);
    a.state.active = b.state.active = true;
    registry.clear("a");
    expect(a.state.active).toBe(false);
    a.state.active = true;
    registry.clearAll();
    expect(registry.active).toEqual([]);
    unregister();
    a.state.active = true;
    expect(registry.active).toEqual([]);
  });

  test("registering the same id replaces it", () => {
    const a = fake("a");
    const a2 = fake("a");
    registry.register(a.overlay);
    registry.register(a2.overlay);
    a.state.active = true;
    expect(registry.active).toEqual([]);
    a2.state.active = true;
    expect(registry.active).toHaveLength(1);
  });
});

describe("app overlays: clear rules and ownership", () => {
  const byId = (id: string) => {
    const overlay = APP_MAP_OVERLAYS.find((o) => o.id === id);
    if (!overlay) throw new Error(id);
    return overlay;
  };

  beforeEach(() => {
    jeepneyStore.disableLayer();
    scheduleRouteStore.clearRoute();
    locationStore.clearRouteWaypoints();
    travelTimeStore.disable();
    measureRouteStore.disable();
    mapViewStore.eventsOnly = false;
    mapToolsStore.close();
    queryStore.clearQuery();
    sidePanelStore.closePanel();
    sidePanelStore.setMobileSheetSnap("closed");
    sidebarStore.changeOpened("map");
  });

  test("a route kept from Layers is stranded once Layers closes; X clears it", () => {
    const route = transitStore.routes[0];
    if (!route) throw new Error("no bundled route");
    // Picked in the Layers route list, which closes Layers.
    jeepneyStore.selectRoute(route.id);
    expect(jeepneyStore.routePinned).toBe(true);
    expect(mapToolsStore.open).toBe(false);
    const overlay = byId("transit-route");
    expect(overlay.isActive()).toBe(true);
    expect(overlay.label()).toBe(route.name);
    expect(overlay.ownerOpen()).toBe(false);
    overlay.clear();
    expect(jeepneyStore.selectedRouteId).toBeNull();
    expect(overlay.isActive()).toBe(false);
  });

  test("the route panel owns its route", () => {
    const route = transitStore.routes[0];
    if (!route) throw new Error("no bundled route");
    queryStore.updateQuery({
      category: "browse",
      type: "result",
      value: "jeepney",
    });
    jeepneyStore.openRouteOnMap(route.id);
    expect(byId("transit-route").ownerOpen()).toBe(true);
  });

  test("a routed class day is stranded off Today and Layers", () => {
    scheduleRouteStore.routedWeekday = "M";
    locationStore.setRouteWaypoints([
      [121.24, 14.16],
      [121.25, 14.17],
    ]);
    const overlay = byId("day-route");
    sidebarStore.changeOpened("today");
    expect(overlay.isActive()).toBe(true);
    expect(overlay.ownerOpen()).toBe(true);
    sidebarStore.changeOpened("map");
    expect(overlay.ownerOpen()).toBe(false);
    expect(byId("link-route").isActive()).toBe(false);
    overlay.clear();
    expect(overlay.isActive()).toBe(false);
  });

  test("a /route link draws a walk with no panel", () => {
    locationStore.setRouteWaypoints([
      [121.24, 14.16],
      [121.25, 14.17],
    ]);
    const overlay = byId("link-route");
    expect(overlay.isActive()).toBe(true);
    expect(overlay.ownerOpen()).toBe(false);
    overlay.clear();
    expect(locationStore.routeWaypoints).toBeNull();
  });

  test("tools are stranded while a sheet covers their card", () => {
    travelTimeStore.enable();
    const overlay = byId("travel-time");
    expect(overlay.ownerOpen()).toBe(true);
    sidePanelStore.setMobileSheetSnap("peek");
    expect(overlay.ownerOpen()).toBe(false);
    overlay.clear();
    expect(travelTimeStore.active).toBe(false);

    measureRouteStore.enable();
    expect(byId("measure").ownerOpen()).toBe(false);
    byId("measure").clear();
    expect(measureRouteStore.active).toBe(false);
  });

  test("Events only belongs to Layers", () => {
    mapViewStore.toggleEventsOnly();
    const overlay = byId("events-only");
    mapToolsStore.toggle();
    expect(overlay.ownerOpen()).toBe(true);
    mapToolsStore.close();
    expect(overlay.ownerOpen()).toBe(false);
    overlay.clear();
    expect(mapViewStore.eventsOnly).toBe(false);
  });

  test("mapIsBare is false while any sheet, list or screen is up", () => {
    expect(mapIsBare()).toBe(true);
    queryStore.updateQuery({
      category: "browse",
      type: "result",
      value: "dorms",
    });
    expect(mapIsBare()).toBe(false);
    queryStore.clearQuery();
    mapToolsStore.toggle();
    expect(mapIsBare()).toBe(false);
    mapToolsStore.close();
    sidebarStore.changeOpened("planner");
    expect(mapIsBare()).toBe(false);
  });
});
