/**
 * Opening and closing the Makiling trail sheet (#716). Search, the map
 * layer, the Layers sheet and place sheets all come through here so the
 * sheet, the layer and the camera stay in step.
 */
import TrailPanel from "@ui/trail/TrailPanel.svelte";
import { dismissEphemeralOverlays } from "./overlay-stack";
import {
  mapToolsStore,
  queryStore,
  sidePanelStore,
  trailStore,
} from "./store.svelte";

export type OpenTrailOptions = {
  /** Keep the place sheet under it (Back returns there). Default false. */
  overPlace?: boolean;
  /** Fit the whole trail when opening the overview. Default true. */
  frame?: boolean;
  /** Fly to the stop when opening at one. Default true. */
  fly?: boolean;
};

export function isTrailPanelShown(): boolean {
  const state = sidePanelStore.state;
  return (
    state !== null && "component" in state && state.component === TrailPanel
  );
}

/** Show the trail and open its sheet, at the overview or at `stopId`. */
export function openTrailSheet(
  stopId: string | null = null,
  { overPlace = false, frame = true, fly = true }: OpenTrailOptions = {},
) {
  // The phone search layer, legend popovers and the Layers sheet give way.
  dismissEphemeralOverlays();
  mapToolsStore.close();
  if (!overPlace && !isTrailPanelShown()) queryStore.clearQuery();
  trailStore.openSheet(stopId);
  if (!isTrailPanelShown()) {
    sidePanelStore.openPanel({ type: "search-result", component: TrailPanel });
  }
  sidePanelStore.expand();
  if (stopId) {
    if (fly) trailStore.flyToStop(stopId);
  } else if (frame) {
    trailStore.requestFrame();
  }
}

/** Back, or the sheet's X: close the sheet, keep the trail drawn. */
export function closeTrailSheet() {
  trailStore.closeSheet();
  if (isTrailPanelShown()) sidePanelStore.closePanel();
}
