import type { MapToolsSection } from '#lib/stores/store-types.js';
import { eventPlacementStore, mapEditStore, mapToolsStore } from '#lib/stores.svelte.js';

/** Single source of truth for which map chrome surfaces are visible. */
export function getMapChromeVisibility() {
	const editMode =
		mapEditStore.enabled || eventPlacementStore.active || eventPlacementStore.creating;

	return {
		editMode,
		showSearchSuggestions: !editMode,
		showEventBanner: !editMode,
		showEventsShelf: !editMode,
		showEditorShelf: !editMode,
		showMapTools: true,
		mapToolsDefaultClosed: editMode,
		showEditDock: mapEditStore.enabled,
		showEventPlacementDock: eventPlacementStore.active || eventPlacementStore.creating
	};
}

export function openMapToolsSection(section: MapToolsSection) {
	mapToolsStore.openSection(section);
}
