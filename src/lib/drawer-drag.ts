export type DrawerDragIntent = "expand" | "collapse" | "none";

/** Drags shorter than this (px) are treated as taps, not swipes. */
export const DRAWER_DRAG_THRESHOLD = 40;

/**
 * Interpret a vertical drag on the drawer handle. Positive deltaY means the
 * pointer moved down (collapse the sheet); negative means up (expand it).
 * Movements under the threshold return "none" so a tap still toggles via click.
 */
export function resolveDrawerDragIntent(
  deltaY: number,
  threshold: number = DRAWER_DRAG_THRESHOLD,
): DrawerDragIntent {
  if (deltaY >= threshold) return "collapse";
  if (deltaY <= -threshold) return "expand";
  return "none";
}
