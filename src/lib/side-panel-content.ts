import type { Component } from "svelte";
import BuildingResult from "@ui/controls/BuildingResult.svelte";
import CampusBrowseList from "@ui/controls/CampusBrowseList.svelte";
import ClassQuery from "@ui/controls/ClassQuery.svelte";
import ClassesList from "@ui/controls/ClassesList.svelte";
import CollegeResult from "@ui/controls/CollegeResult.svelte";
import DivisionResult from "@ui/controls/DivisionResult.svelte";
import DormResult from "@ui/controls/DormResult.svelte";
import EventResult from "@ui/controls/EventResult.svelte";
import EventsList from "@ui/controls/EventsList.svelte";
import OrgResult from "@ui/controls/OrgResult.svelte";
import PlaceResult from "@ui/controls/PlaceResult.svelte";
import ProposalReviewPanel from "@ui/ProposalReviewPanel.svelte";
import RoomResult from "@ui/room/RoomResult.svelte";
import type { QueryStoreState, SidePanelMetaData } from "./stores/store-types";

type Category = NonNullable<QueryStoreState["category"]>;

const CATEGORY_PANELS: Record<Category, Component> = {
  building: BuildingResult,
  college: CollegeResult,
  division: DivisionResult,
  room: RoomResult,
  class: ClassQuery,
  classes: ClassesList,
  browse: CampusBrowseList,
  dorm: DormResult,
  organization: OrgResult,
  place: PlaceResult,
  event: EventResult,
  events: EventsList,
};

/**
 * The component the side panel renders.
 *
 * `openPanel()` metadata wins when it names one, but it cannot be the only
 * source. Deep links, browser back/forward and every caller that only sets a
 * query never reach `openPanel()`, so gating the panel on it alone left those
 * paths showing an empty map. Resolving from the query category here keeps one
 * gate for every path instead of pairing `openPanel()` at each call site.
 */
export function resolvePanelContent(
  state: SidePanelMetaData | null,
  category: QueryStoreState["category"],
): Component | null {
  if (state) {
    if (state.type === "admin-suggestions") return ProposalReviewPanel;
    if (state.type === "browsing-events") return EventsList;
    if (state.component) return state.component;
  }
  return category ? (CATEGORY_PANELS[category] ?? null) : null;
}
