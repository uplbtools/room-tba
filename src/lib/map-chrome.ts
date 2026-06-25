import {
  eventPlacementStore,
  mapEditStore,
  mapToolsStore,
} from "./store.svelte";

/** Single source of truth for which map chrome surfaces are visible. */
export function getMapChromeVisibility() {
  const editMode =
    mapEditStore.enabled ||
    eventPlacementStore.active ||
    eventPlacementStore.creating;

  return {
    editMode,
    showSearchSuggestions: !editMode,
    showEventBanner: !editMode,
    showEventsShelf: !editMode,
    showMapTools: true,
    mapToolsDefaultClosed: editMode,
    showEditDock: mapEditStore.enabled,
    showEventPlacementDock:
      eventPlacementStore.active || eventPlacementStore.creating,
  };
}

export function openMapToolsSection(
  section: import("./store.svelte").MapToolsSection,
) {
  mapToolsStore.openSection(section);
}
