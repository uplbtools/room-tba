import { dismissEphemeralOverlays } from "./overlay-stack.js";
import {
  CAMPUS_BROWSE_LABELS,
  campusBrowseQuery,
  type CampusBrowseTab,
} from "./browse-campus-shared.js";
import type { SidePanelStore, QueryStore } from "./stores/ui-stores.svelte.js";
import { jeepneyStore } from "./store.svelte.js";

export type { CampusBrowseTab } from "./browse-campus-shared.js";
import CampusBrowseList from "@ui/controls/CampusBrowseList.svelte";
import ClassesList from "@ui/controls/ClassesList.svelte";

// Both helpers name the panel themselves rather than leaving it to each caller.
// `resolvePanelContent` would reach the same component from the query category,
// but every browse entry point routes through here, so owning the call in one
// place is what keeps a caller from setting a query and rendering nothing.
// See browse-campus.store.test.ts.
export function openCampusBrowse(
  queryStore: QueryStore,
  sidePanelStore: SidePanelStore,
  tab: CampusBrowseTab = "buildings",
  /** Search bar text; defaults to the tab's directory label. */
  label: string = CAMPUS_BROWSE_LABELS[tab],
) {
  dismissEphemeralOverlays();
  // A selected jeepney stop outranks panel content in SidePanel, so browsing
  // anywhere must drop it or the stop panel stays painted over the list.
  jeepneyStore.closeStop();
  queryStore.updateQuery(campusBrowseQuery(tab));
  // The bar names the list it is showing, and its X closes it.
  queryStore.inputValue = label;
  sidePanelStore.openPanel({
    type: "browsing-entities",
    component: CampusBrowseList,
  });
  sidePanelStore.expand();
}

export function openBrowseClasses(
  queryStore: QueryStore,
  sidePanelStore: SidePanelStore,
) {
  dismissEphemeralOverlays();
  jeepneyStore.closeStop();
  queryStore.updateQuery({
    category: "classes",
    type: "result",
    value: "All classes",
  });
  queryStore.inputValue = "";
  sidePanelStore.openPanel({
    type: "browsing-entities",
    component: ClassesList,
  });
  sidePanelStore.expand();
}
