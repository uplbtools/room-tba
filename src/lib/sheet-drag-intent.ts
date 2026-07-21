/** Decides what a released mobile detail-sheet drag should do, given the
 * finger's net vertical movement and release velocity (#411). Pure so the
 * threshold/velocity/direction combinations are covered by a fast unit test
 * instead of only being exercised implicitly through pointer-event mounts. */
export function resolveSheetDragReleaseIntent({
  delta,
  velocity,
  collapsed,
  followThreshold,
  flickVelocity,
}: {
  /** Net vertical pointer movement in px; positive = dragged down. */
  delta: number;
  /** abs(delta) / elapsed ms. */
  velocity: number;
  collapsed: boolean;
  followThreshold: number;
  flickVelocity: number;
}): "expand" | "collapse" | "none" {
  if (velocity > flickVelocity) {
    return delta > 0 ? "collapse" : "expand";
  }
  if (collapsed) {
    return delta < -followThreshold ? "expand" : "none";
  }
  return delta > followThreshold ? "collapse" : "none";
}
