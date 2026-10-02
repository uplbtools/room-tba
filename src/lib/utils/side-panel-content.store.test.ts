// import { describe, expect, test } from 'vitest';

// import { resolvePanelContent } from '$lib/utils/side-panel-content';
// import BuildingResult from '../../routes/(app)/map/buildings/[id]/BuildingResult.svelte';
// import CampusBrowseList from '$lib/components/controls/CampusBrowseList.svelte';
// import ProposalReviewPanel from '$lib/components/ProposalReviewPanel.svelte';
// import RoomResult from '$lib/components/room/RoomResult.svelte';

// describe('resolvePanelContent', () => {
// 	/**
// 	 * The regression this guards: the panel used to render only while
// 	 * `openPanel()` had run, so `/room/<code>` and back/forward, which hydrate
// 	 * the query and nothing else, showed an empty map.
// 	 */
// 	test('resolves from the query category with no openPanel metadata', () => {
// 		expect(resolvePanelContent(null, 'room')).toBe(RoomResult);
// 		expect(resolvePanelContent(null, 'building')).toBe(BuildingResult);
// 	});

// 	test('renders nothing when there is no query and no metadata', () => {
// 		expect(resolvePanelContent(null, null)).toBe(null);
// 	});

// 	test('openPanel metadata wins over the query category', () => {
// 		const state = {
// 			type: 'browsing-entities',
// 			component: CampusBrowseList
// 		} as const;
// 		expect(resolvePanelContent(state, 'room')).toBe(CampusBrowseList);
// 	});

// 	test('renders the review queue, which has no query category', () => {
// 		expect(resolvePanelContent({ type: 'admin-suggestions' }, null)).toBe(ProposalReviewPanel);
// 	});
// });
