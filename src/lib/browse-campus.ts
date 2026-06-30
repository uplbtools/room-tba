import { dismissEphemeralOverlays } from "./overlay-stack.js";
import {
  campusBrowseQuery,
  type CampusBrowseTab,
} from "./browse-campus-shared.js";
import type {
  MainControlsStore,
  QueryStore,
} from "./stores/ui-stores.svelte.js";

export type { CampusBrowseTab } from "./browse-campus-shared.js";

export function openCampusBrowse(
  queryStore: QueryStore,
  sidePanelStore: MainControlsStore,
  tab: CampusBrowseTab = "buildings",
) {
  dismissEphemeralOverlays();
  queryStore.updateQuery(campusBrowseQuery(tab));
  queryStore.inputValue = "";
  sidePanelStore.expand();
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
