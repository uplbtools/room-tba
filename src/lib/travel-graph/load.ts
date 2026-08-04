/**
 * Lazy loader for the vendored walk graph. The JSON (~100 KB) is a separate
 * Vite chunk fetched the first time a travel tool activates, then cached for
 * the session (and precached by the PWA for offline use).
 */

import {
  buildTravelGraph,
  type TravelGraph,
  type WalkGraphData,
} from "./engine";

let cached: Promise<TravelGraph> | null = null;

export function loadTravelGraph(): Promise<TravelGraph> {
  cached ??= import("../../generated/walk-graph.json").then((module) =>
    buildTravelGraph(module.default as unknown as WalkGraphData),
  );
  return cached;
}
