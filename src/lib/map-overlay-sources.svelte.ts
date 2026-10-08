/**
 * The app's transient map overlays, registered with the map-overlay registry,
 * and Back for them. See stores/map-overlays.svelte.ts for the model.
 */
import { openCampusBrowse } from "./browse-campus";
import { trackOverlay } from "./track-overlay.svelte";
import { isRoutePanelQuery } from "./transit-route-visibility";
import { mapOverlays, type MapOverlay } from "./stores/map-overlays.svelte";
import {
  adminAuthStore,
  building3DStore,
  directionsStore,
  editorChromeStore,
  jeepneyStore,
  locationStore,
  mapToolsStore,
  mapViewStore,
  measureRouteStore,
  modalStore,
  queryStore,
  scheduleRouteStore,
  sidePanelStore,
  sidebarStore,
  travelTimeStore,
} from "./store.svelte";

const MAP_SCREENS = new Set(["map", "contributors", "settings"]);

/**
 * Nothing but the map is on screen: no sheet, list, dialog, Layers or full
 * screen. Back and Escape clear overlays only then; otherwise they close the
 * top layer first.
 */
export function mapIsBare(): boolean {
  return (
    MAP_SCREENS.has(sidebarStore.panelOpen) &&
    queryStore.category === null &&
    !sidePanelStore.active &&
    !directionsStore.active &&
    jeepneyStore.selectedStopIndex === null &&
    !modalStore.open &&
    !mapToolsStore.open &&
    building3DStore.buildingName === null &&
    !editorChromeStore.additionModalOpen &&
    !adminAuthStore.loginOpen
  );
}

/** The bottom-band tool card (legend, measure panel) is visible. */
function toolCardVisible() {
  return (
    MAP_SCREENS.has(sidebarStore.panelOpen) &&
    sidePanelStore.mobileSheetSnap === "closed"
  );
}

const openLayers = () => mapToolsStore.openSection("view");

const dayRouted = () =>
  scheduleRouteStore.routedWeekday !== null &&
  locationStore.routeWaypoints !== null;

export const APP_MAP_OVERLAYS: MapOverlay[] = [
  {
    // A route kept on the map from the Layers route picker (pinned). Unpinned
    // routes leave with their panel (TransitRouteLifecycle).
    id: "transit-route",
    kind: "route",
    label: () => jeepneyStore.drawnRoute?.name ?? "Route",
    isActive: () => jeepneyStore.drawnRoute !== null,
    ownerOpen: () =>
      isRoutePanelQuery(queryStore.category, queryStore.queryValue) ||
      jeepneyStore.selectedStopIndex !== null ||
      mapToolsStore.open,
    clear: () => jeepneyStore.clearDrawnRoute(),
    reopen: () => {
      const id = jeepneyStore.drawnRoute?.id;
      if (!id) return;
      openCampusBrowse(queryStore, sidePanelStore, "jeepney");
      jeepneyStore.openRouteOnMap(id);
    },
  },
  {
    // "Route my day" closes Today and leaves the walk on the map.
    id: "day-route",
    kind: "route",
    label: () => "Class route",
    isActive: dayRouted,
    ownerOpen: () => sidebarStore.panelOpen === "today" || mapToolsStore.open,
    clear: () => scheduleRouteStore.clearRoute(),
    reopen: () => mapToolsStore.openSection("schedule"),
  },
  {
    // /route/<from>/<to> links draw a walk with no panel at all.
    id: "link-route",
    kind: "route",
    label: () => "Walking route",
    isActive: () =>
      locationStore.routeWaypoints !== null &&
      scheduleRouteStore.routedWeekday === null &&
      !directionsStore.active,
    ownerOpen: () => false,
    clear: () => locationStore.clearRouteWaypoints(),
  },
  {
    id: "travel-time",
    kind: "tool",
    label: () => "Walking time",
    isActive: () => travelTimeStore.active,
    ownerOpen: toolCardVisible,
    clear: () => travelTimeStore.disable(),
    reopen: openLayers,
  },
  {
    id: "measure",
    kind: "tool",
    label: () => "Measure route",
    isActive: () => measureRouteStore.active,
    ownerOpen: toolCardVisible,
    clear: () => measureRouteStore.disable(),
    reopen: openLayers,
  },
  {
    // Layers "Pins: Events only" hides every building and dorm pin.
    id: "events-only",
    kind: "filter",
    label: () => "Events only",
    isActive: () => mapViewStore.eventsOnly,
    ownerOpen: () => mapToolsStore.open,
    clear: () => {
      mapViewStore.eventsOnly = false;
    },
    reopen: openLayers,
  },
];

let installed = false;

/**
 * Register the app overlays and give them a Back entry: while the map is bare
 * and an overlay is drawn, Back clears the most recent one before leaving.
 */
export function installMapOverlays() {
  if (installed) return;
  installed = true;
  for (const overlay of APP_MAP_OVERLAYS) mapOverlays.register(overlay);
  $effect.root(() => {
    trackOverlay(
      "map-overlays",
      () => mapIsBare() && mapOverlays.active.length > 0,
      () => {
        mapOverlays.clearMostRecent();
      },
    );
  });
}
