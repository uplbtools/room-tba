import { dismissEphemeralOverlays } from "./overlay-stack.js";
import {
  campusBrowseQuery,
  type CampusBrowseTab,
} from "./browse-campus-shared.js";
import type { SidePanelStore, QueryStore } from "./stores/ui-stores.svelte.js";

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
) {
  dismissEphemeralOverlays();
  queryStore.updateQuery(campusBrowseQuery(tab));
  queryStore.inputValue = "";
  sidePanelStore.openPanel({
    type: "browsing-entities",
    component: CampusBrowseList,
  });
  sidePanelStore.expand();
}

// ponytail: `sidePanelStore` stays optional so the existing two call sites keep
// working unchanged — Sidebar opens the panel itself, CampusBrowseChips relies
// on this helper.
export function openBrowseClasses(
  queryStore: QueryStore,
  sidePanelStore?: SidePanelStore,
) {
  dismissEphemeralOverlays();
  queryStore.updateQuery({
    category: "classes",
    type: "result",
    value: "All classes",
  });
  queryStore.inputValue = "";
  sidePanelStore?.openPanel({
    type: "browsing-entities",
    component: ClassesList,
  });
  sidePanelStore?.expand();
}
