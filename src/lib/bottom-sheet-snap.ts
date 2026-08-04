/** Snap points for the mobile entity bottom sheet (GMaps-style). */
export type BottomSheetSnap = "peek" | "expanded";

export type BottomSheetReleaseIntent =
  | "expand"
  | "peek"
  | "dismiss"
  | "none";

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
