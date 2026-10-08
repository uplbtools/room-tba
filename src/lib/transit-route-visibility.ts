/**
 * When a drawn jeepney route outlives the panel that drew it. A route line and
 * its numbered stop pins belong to the route (or stop) panel: once the rider
 * closes it, goes Back, opens another list, or picks a place, the route must go
 * too, or it stays on the map with nothing on screen that can remove it. Only a
 * route the rider chose to keep on the map (pinned, e.g. from the Map tools
 * route picker) stays.
 */
export type RouteVisibilityState = {
  routeId: string | null;
  pinned: boolean;
  /** A stop of the route is open (its panel shows over any list). */
  stopOpen: boolean;
  /** The side panel is showing this route (browse "jeepney" with a route). */
  routePanelOpen: boolean;
};

export function shouldClearDrawnRoute(state: RouteVisibilityState): boolean {
  return (
    state.routeId !== null &&
    !state.pinned &&
    !state.stopOpen &&
    !state.routePanelOpen
  );
}

/** The browse query that renders the route panel (see SidePanel.svelte). */
export function isRoutePanelQuery(
  category: string | null,
  value: string | null | undefined,
): boolean {
  return category === "browse" && value === "jeepney";
}
