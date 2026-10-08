import type { AppBootstrapPhase } from "./stores/store-types";

export type CampusListState = "loading" | "ready" | "empty" | "offline";

/**
 * What a data-backed list (Dorms, Stores, Events…) should show. Campus data
 * loads behind a live map now, so an empty list can mean "still loading",
 * "never saved on this device and we are offline", or genuinely empty; only
 * the last one may say nothing is listed.
 */
export function campusListState(input: {
  count: number;
  loaded: boolean;
  phase: AppBootstrapPhase;
  online: boolean;
}): CampusListState {
  if (input.count > 0) return "ready";
  if (!input.loaded) return "loading";
  if (!input.online) return "offline";
  if (input.phase === "ready" || input.phase === "error") return "empty";
  return "loading";
}
