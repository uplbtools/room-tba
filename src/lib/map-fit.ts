/** [[west, south], [east, north]], the shape `map.fitBounds` takes. */
export type LngLatBoundsTuple = [[number, number], [number, number]];

/**
 * The box around a set of [lng, lat] points, or null when there are none.
 * Non-finite coordinates (a pin with a missing lat) are skipped.
 */
export function pointsBounds(
  points: Iterable<readonly [number, number]>,
): LngLatBoundsTuple | null {
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;
  for (const [lng, lat] of points) {
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
    if (lng < west) west = lng;
    if (lng > east) east = lng;
    if (lat < south) south = lat;
    if (lat > north) north = lat;
  }
  if (west === Infinity) return null;
  return [
    [west, south],
    [east, north],
  ];
}

/** Desktop side panel width (25.75rem), the left cover when it is open. */
export const SIDE_PANEL_WIDTH_PX = 25.75 * 16;

export type MapPadding = {
  top: number;
  bottom: number;
  left: number;
  right: number;
};

/**
 * Padding that keeps a fitted area inside the part of the map nobody is
 * covering: below the search bar and chips, above the mobile sheet (or
 * beside the desktop panel, `leftPanelWidth` wide; 0 when collapsed; or
 * beside the phone-landscape side sheet). A flat 80px left most of a route
 * under the phone sheet.
 */
export function measureVisibleMapPadding(
  map: { getContainer: () => HTMLElement },
  { mobile, leftPanelWidth }: { mobile: boolean; leftPanelWidth: number },
): MapPadding {
  const gap = 24;
  const frame = map.getContainer().getBoundingClientRect();
  const chromeBottom = Math.max(
    frame.top,
    ...[
      ...document.querySelectorAll(
        ".search-root .map-search-chrome__pill, .search-root .map-filter-chips, .directions-route-chips",
      ),
    ]
      .map((el) => el.getBoundingClientRect())
      .filter((r) => r.height > 0 && r.bottom < frame.top + frame.height / 2)
      .map((r) => r.bottom),
  );
  const padding = {
    top: chromeBottom - frame.top + gap,
    bottom: gap,
    left: gap,
    right: gap,
  };
  if (mobile) {
    const root = document.querySelector(".bottom-sheet-root");
    const sheet = root?.querySelector<HTMLElement>(".bottom-sheet");
    if (root?.classList.contains("bottom-sheet-root--side") && sheet) {
      // Phone landscape: the sheet is a left side panel, so it covers the
      // left of the map, not the bottom.
      const rect = sheet.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        padding.left = Math.max(gap, rect.right - frame.left + gap);
      }
    } else if (root && sheet) {
      // The inline transform is where the sheet is going, not where its
      // open animation happens to be this frame.
      const target = /translate3d\(0(?:px)?,\s*([\d.]+)px/.exec(
        sheet.style.transform,
      );
      const sheetTop =
        root.getBoundingClientRect().top + (target ? Number(target[1]) : 0);
      padding.bottom = Math.max(gap, frame.bottom - sheetTop + gap);
    }
  } else if (leftPanelWidth > 0) {
    padding.left = leftPanelWidth + gap;
  }
  // Never ask for more padding than the map has room for.
  const spareH = frame.height - padding.top - padding.bottom;
  if (spareH < 80) {
    const scale =
      Math.max(0, frame.height - 80) / (padding.top + padding.bottom);
    padding.top *= scale;
    padding.bottom *= scale;
  }
  const spareW = frame.width - padding.left - padding.right;
  if (spareW < 80) {
    padding.left = Math.max(gap, frame.width - 80 - padding.right);
  }
  return padding;
}
