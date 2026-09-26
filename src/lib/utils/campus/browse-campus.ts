import { dismissEphemeralOverlays } from '../overlay-stack.js';
import { campusBrowseQuery, type CampusBrowseTab } from './browse-campus-shared.js';

export type { CampusBrowseTab } from './browse-campus-shared.js';
import CampusBrowseList from '$lib/components/controls/CampusBrowseList.svelte';
import ClassesList from '$lib/components/controls/ClassesList.svelte';
import type searchInfo from '$lib/stores/searchInfo.svelte.js';
import type SidePanelStore from '$lib/stores/ui/SidePanelStore.svelte.js';

// Both helpers name the panel themselves rather than leaving it to each caller.
// `resolvePanelContent` would reach the same component from the query category,
// but every browse entry point routes through here, so owning the call in one
// place is what keeps a caller from setting a query and rendering nothing.
// See browse-campus.store.test.ts.
export function openCampusBrowse(
	searchInfo: searchInfo,
	sidePanelStore: SidePanelStore,
	tab: CampusBrowseTab = 'buildings'
) {
	dismissEphemeralOverlays();
	searchInfo.updateQuery(campusBrowseQuery(tab));
	searchInfo.inputValue = '';
	sidePanelStore.openPanel({
		type: 'browsing-entities',
		component: CampusBrowseList
	});
	sidePanelStore.expand();
}

// ponytail: `sidePanelStore` stays optional so the existing two call sites keep
// working unchanged — Sidebar opens the panel itself, CampusBrowseChips relies
// on this helper.
export function openBrowseClasses(searchInfo: searchInfo, sidePanelStore?: SidePanelStore) {
	dismissEphemeralOverlays();
	searchInfo.updateQuery({
		category: 'classes',
		type: 'result',
		value: 'All classes'
	});
	searchInfo.inputValue = '';
	sidePanelStore?.openPanel({
		type: 'browsing-entities',
		component: ClassesList
	});
	sidePanelStore?.expand();
}
