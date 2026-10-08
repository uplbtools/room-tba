/**
 * Route overview camera (#966): fit both trip ends and the drawn route into
 * the map strip between the top panel (From/To fields or the navigation
 * banner) and the bottom sheet, or beside the desktop drawer.
 */

import { directionsStore, locationStore, mapStore } from "@lib/store.svelte";
import {
  computeDirectionsFitExtents,
  directionsFitBounds,
  directionsFitPaddingFromRects,
  estimateDestinationLabelHalfWidthPx,
} from "@lib/travel-graph/directions-fit";

function measurePadding(
  map: { getContainer: () => HTMLElement },
  destinationLabel: string,
  destOnRight: boolean,
) {
  const mapRect = map.getContainer().getBoundingClientRect();
  const mobile = window.matchMedia("(max-width: 48rem)").matches;

  const topEl =
    document.querySelector(".nav-banner") ??
    document.querySelector(".directions-route-chips") ??
    document.querySelector(".map-search-chrome") ??
    document.querySelector(".search-shell-main");
  const topBottom =
    topEl?.getBoundingClientRect().bottom ?? mapRect.top + (mobile ? 140 : 88);

  const sheetEl = document.querySelector(".bottom-sheet");
  const sheetTop =
    sheetEl?.getBoundingClientRect().top ??
    mapRect.bottom - (mobile ? mapRect.height * 0.44 : 64);

  const statusEl = document.querySelector(".bottom-chrome");
  const statusTop = statusEl?.getBoundingClientRect().top ?? mapRect.bottom;
  const coverBottom = mobile ? Math.min(sheetTop, statusTop) : statusTop;

  const drawerEl = document.querySelector(".drawer:not(.is-collapsed)");
  const drawerRight = drawerEl?.getBoundingClientRect().right ?? mapRect.left;

  return directionsFitPaddingFromRects(mapRect, {
    topBottom,
    coverBottom,
    leftCover: !mobile ? Math.max(0, drawerRight - mapRect.left) : 0,
    mobile,
    destinationLabelHalfWidthPx:
      estimateDestinationLabelHalfWidthPx(destinationLabel),
    destOnRight,
    // Room for the start puck and the end pin beyond the bare coordinates.
    edgeGutterPx: 16,
  });
}

/** Frame the selected route. Two frames late so the sheet has settled. */
export function fitDirectionsRoute(duration = 900) {
  const map = mapStore.mapInstance;
  const destination = directionsStore.destination;
  if (!map || !destination) return;

  const gps = locationStore.coords;
  const origin =
    gps && !directionsStore.originFixed
      ? { lng: gps[0], lat: gps[1] }
      : directionsStore.origin;
  if (!origin) return;

  const extents = computeDirectionsFitExtents({
    origin,
    destination,
    waypoints: directionsStore.waypoints,
    accuracyMeters: locationStore.accuracyMeters ?? 25,
  });
  const bounds = directionsFitBounds(
    extents,
    directionsStore.selectedRouteCoords,
  );
  const label = destination.label || "Destination";

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      // fitBounds adds its padding to the map's own (the sheet inset the map
      // already carries), so pass only what the chrome covers beyond that.
      const chrome = measurePadding(map, label, extents.destOnRight);
      const current = map.getPadding();
      const padding = {
        top: Math.max(0, chrome.top - (current.top ?? 0)),
        bottom: Math.max(0, chrome.bottom - (current.bottom ?? 0)),
        left: Math.max(0, chrome.left - (current.left ?? 0)),
        right: Math.max(0, chrome.right - (current.right ?? 0)),
      };
      map.fitBounds(bounds, {
        padding,
        bearing: 0,
        pitch: 0,
        maxZoom: 18,
        duration,
      });
    });
  });
}
