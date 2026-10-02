// import type { Component } from 'svelte';
// // import BuildingResult from '../../routes/(app)/map/buildings/[id]/BuildingResult.svelte';
// // import CampusBrowseList from '$lib/components/controls/CampusBrowseList.svelte';
// // import ClassQuery from '$lib/components/controls/ClassQuery.svelte';
// // import ClassesList from '$lib/components/controls/ClassesList.svelte';
// // import CollegeResult from '$lib/components/controls/CollegeResult.svelte';
// // import DivisionResult from '$lib/components/controls/DivisionResult.svelte';
// // import DormResult from '$lib/components/controls/DormResult.svelte';
// // import EventResult from '$lib/components/controls/EventResult.svelte';
// // import EventsList from '$lib/components/controls/EventsList.svelte';
// // import OrgResult from '$lib/components/controls/OrgResult.svelte';
// // import PlaceResult from '$lib/components/controls/PlaceResult.svelte';
// // import ProposalReviewPanel from '$lib/components/ProposalReviewPanel.svelte';
// // import RoomResult from '$lib/components/room/RoomResult.svelte';
// import type { SearchInfoState, SidePanelMetaData } from '../stores/store-types';

// type Category = NonNullable<SearchInfoState['category']>;

// const CATEGORY_PANELS: Record<Category, Component> = {
// 	building: BuildingResult,
// 	college: CollegeResult,
// 	division: DivisionResult,
// 	room: RoomResult,
// 	class: ClassQuery,
// 	classes: ClassesList,
// 	browse: CampusBrowseList,
// 	dorm: DormResult,
// 	organization: OrgResult,
// 	place: PlaceResult,
// 	event: EventResult,
// 	events: EventsList
// };

// /**
//  * The component the side panel renders.
//  *
//  * `openPanel()` metadata wins when it names one, but it cannot be the only
//  * source. Deep links, browser back/forward and every caller that only sets a
//  * query never reach `openPanel()`, so gating the panel on it alone left those
//  * paths showing an empty map. Resolving from the query category here keeps one
//  * gate for every path instead of pairing `openPanel()` at each call site.
//  */
// export function resolvePanelContent(
// 	state: SidePanelMetaData | null,
// 	category: SearchInfoState['category']
// ): Component | null {
// 	if (state) {
// 		if (state.type === 'admin-suggestions') return ProposalReviewPanel;
// 		if (state.type === 'browsing-events') return EventsList;
// 		if ('component' in state && state.component) return state.component;
// 	}
// 	return category ? (CATEGORY_PANELS[category] ?? null) : null;
// }
