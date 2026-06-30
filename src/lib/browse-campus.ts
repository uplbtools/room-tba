import { dismissEphemeralOverlays } from "./overlay-stack.js";
import type { MainControlsStore, ModalStore, QueryStore } from "./stores/ui-stores.svelte.js";

export type CampusBrowseTab = "buildings" | "colleges" | "divisions";

export function openCampusBrowseModal(
  modalStore: ModalStore,
  tab: CampusBrowseTab = "buildings",
) {
  modalStore.openModal("filter", { filterTab: tab });
}

export function openBrowseClasses(
  queryStore: QueryStore,
  sidePanelStore: MainControlsStore,
) {
  dismissEphemeralOverlays();
  queryStore.updateQuery({
    category: "classes",
    type: "result",
    value: "All classes",
  });
  queryStore.inputValue = "";
  sidePanelStore.expand();
}
