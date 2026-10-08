/**
 * Phone held sideways (Jakob audit macro 14): ~340-430px tall. A bottom
 * sheet there leaves a sliver of map and a sliver of sheet, so the sheet
 * becomes a full-height left side panel instead (GMaps landscape), the
 * bottom nav goes icon-only and the map controls wrap into columns.
 * CSS repeats this query: `(orientation: landscape) and (max-height: 500px)`.
 */
export const LANDSCAPE_COMPACT_MEDIA =
  "(orientation: landscape) and (max-height: 500px)";

/**
 * Snap points for the mobile entity bottom sheet (GMaps-style). `half` only
 * exists when the sheet is given a halfRatio; plain two-point sheets (the 3D
 * viewer) jump between peek and expanded.
 */
export type BottomSheetSnap = "peek" | "half" | "expanded";

export type BottomSheetReleaseIntent = "expand" | "peek" | "dismiss" | "none";

/** Decide snap after a drag release. Pure for unit tests. */
export function resolveBottomSheetRelease({
  delta,
  velocity,
  snap,
  followThreshold,
  dismissThreshold,
  flickVelocity,
}: {
  /** Net vertical movement in px; positive = dragged down. */
  delta: number;
  /** abs(delta) / elapsed ms. */
  velocity: number;
  snap: BottomSheetSnap;
  followThreshold: number;
  /** Extra distance (from peek) required to dismiss. */
  dismissThreshold: number;
  flickVelocity: number;
}): BottomSheetReleaseIntent {
  const flick = velocity > flickVelocity;

  if (snap === "peek") {
    if (flick) {
      if (delta < 0) return "expand";
      if (delta > 0) return "dismiss";
      return "none";
    }
    if (delta < -followThreshold) return "expand";
    if (delta > dismissThreshold) return "dismiss";
    return "none";
  }

  // expanded
  if (flick) {
    return delta > 0 ? "peek" : "none";
  }
  if (delta > followThreshold) return "peek";
  return "none";
}

/** How much of the sheet container is hidden above the viewport (translateY). */
export function sheetTranslateY(
  visibleHeight: number,
  containerHeight: number,
): number {
  if (containerHeight <= 0) return 0;
  return Math.max(0, containerHeight - visibleHeight);
}

export type SnapHeights = {
  peek: number;
  /** Absent when the sheet has no middle stop (or it would sit on a neighbour). */
  half?: number;
  expanded: number;
};

/** Stops that exist, lowest first. */
export function snapOrder(heights: SnapHeights): BottomSheetSnap[] {
  return heights.half === undefined
    ? ["peek", "expanded"]
    : ["peek", "half", "expanded"];
}

/** The snap after `snap` going up (+1) or down (-1); null past either end. */
export function neighbourSnap(
  snap: BottomSheetSnap,
  direction: 1 | -1,
  heights: SnapHeights,
): BottomSheetSnap | null {
  const order = snapOrder(heights);
  const i = order.indexOf(snap);
  return order[i + direction] ?? null;
}

/** Visible height of a stop; a missing half falls back to peek. */
export function snapHeight(
  snap: BottomSheetSnap,
  heights: SnapHeights,
): number {
  if (snap === "expanded") return heights.expanded;
  if (snap === "half") return heights.half ?? heights.peek;
  return heights.peek;
}

/**
 * Where a drag ends when the sheet has a middle stop. The finger's projected
 * height picks the nearest stop, but a deliberate drag (past `followThreshold`)
 * or a flick always moves at least one stop that way, so a short pull still
 * advances. Pulling below peek by `dismissThreshold`, or flicking down from
 * peek, dismisses.
 */
export function resolveSnapRelease({
  delta,
  velocity,
  snap,
  heights,
  followThreshold,
  dismissThreshold,
  flickVelocity,
}: {
  /** Net vertical movement in px; positive = dragged down. */
  delta: number;
  velocity: number;
  snap: BottomSheetSnap;
  heights: SnapHeights;
  followThreshold: number;
  dismissThreshold: number;
  flickVelocity: number;
}): BottomSheetSnap | "dismiss" | "none" {
  const order = snapOrder(heights);
  const here = order.includes(snap) ? snap : "peek";
  const direction: 1 | -1 = delta < 0 ? 1 : -1;

  if (velocity > flickVelocity && delta !== 0) {
    const next = neighbourSnap(here, direction, heights);
    if (next) return next;
    return here === "peek" && direction === -1 ? "dismiss" : "none";
  }

  if (here === "peek" && delta > dismissThreshold) return "dismiss";

  const projected = snapHeight(here, heights) - delta;
  let nearest = here;
  let best = Number.POSITIVE_INFINITY;
  for (const candidate of order) {
    const gap = Math.abs(snapHeight(candidate, heights) - projected);
    if (gap < best) {
      best = gap;
      nearest = candidate;
    }
  }
  if (nearest === here && Math.abs(delta) > followThreshold) {
    nearest = neighbourSnap(here, direction, heights) ?? here;
  }
  return nearest === here ? "none" : nearest;
}
