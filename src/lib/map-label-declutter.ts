/** Screen rectangle in CSS pixels (a DOMRect subset). */
export type LabelRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

/**
 * Where a label sits around its pin, in the order tried. Right first, like
 * Google Maps names; then left, below and above, MapLibre's
 * `text-variable-anchor` idea for HTML labels.
 */
export const LABEL_ANCHORS = ["right", "left", "bottom", "top"] as const;
export type LabelAnchor = (typeof LABEL_ANCHORS)[number];

export type LabelCandidate = {
  id: number;
  /** Lower draws first and wins collisions. 0 = never hidden (selected). */
  priority: number;
  /** The label's size; its position comes from the anchor. */
  width: number;
  height: number;
  pin: LabelRect;
};

/** Slack so labels that only kiss at their rounded corners both stay. */
const GAP_PX = 2;
/** Space between a pin and its label. */
const OFFSET_PX = 4;

function overlaps(a: LabelRect, b: LabelRect): boolean {
  return (
    a.left < b.right - GAP_PX &&
    b.left < a.right - GAP_PX &&
    a.top < b.bottom - GAP_PX &&
    b.top < a.bottom - GAP_PX
  );
}

/** The label's screen box when it sits at `anchor` beside `pin`. */
export function labelRectAt(
  anchor: LabelAnchor,
  pin: LabelRect,
  width: number,
  height: number,
): LabelRect {
  const midX = (pin.left + pin.right) / 2;
  const midY = (pin.top + pin.bottom) / 2;
  switch (anchor) {
    case "right":
      return {
        left: pin.right + OFFSET_PX,
        right: pin.right + OFFSET_PX + width,
        top: midY - height / 2,
        bottom: midY + height / 2,
      };
    case "left":
      return {
        left: pin.left - OFFSET_PX - width,
        right: pin.left - OFFSET_PX,
        top: midY - height / 2,
        bottom: midY + height / 2,
      };
    case "bottom":
      return {
        left: midX - width / 2,
        right: midX + width / 2,
        top: pin.bottom + OFFSET_PX,
        bottom: pin.bottom + OFFSET_PX + height,
      };
    case "top":
      return {
        left: midX - width / 2,
        right: midX + width / 2,
        top: pin.top - OFFSET_PX - height,
        bottom: pin.top - OFFSET_PX,
      };
  }
}

/**
 * Pin labels are HTML, so MapLibre's own symbol collision never sees them.
 * This is the same idea by hand: greedy by priority, each label takes the
 * first anchor where it overlaps no label already placed, no other pin
 * (labels used to paint under neighbouring pins on desktop) and no fixed
 * chrome such as the search bar, and that fits inside `bounds` (the map's
 * box, so names never run off the screen edge). A label with no free anchor is hidden
 * (null). Priority 0 (the selected place) always shows, on the right.
 *
 * `pins` are every pin on screen, labelled or not. Pass each candidate's own
 * `pin` object in it unchanged: a label skips its own pin by identity.
 */
export function placeLabels(
  candidates: readonly LabelCandidate[],
  pins: readonly LabelRect[] = [],
  blocked: readonly LabelRect[] = [],
  bounds?: LabelRect,
): Map<number, LabelAnchor | null> {
  const order = [...candidates].sort((a, b) => a.priority - b.priority);
  const kept: LabelRect[] = [];
  const placed = new Map<number, LabelAnchor | null>();
  for (const candidate of order) {
    if (candidate.priority <= 0) {
      kept.push(
        labelRectAt("right", candidate.pin, candidate.width, candidate.height),
      );
      placed.set(candidate.id, "right");
      continue;
    }
    let chosen: LabelAnchor | null = null;
    for (const anchor of LABEL_ANCHORS) {
      const rect = labelRectAt(
        anchor,
        candidate.pin,
        candidate.width,
        candidate.height,
      );
      const outside =
        bounds !== undefined &&
        (rect.left < bounds.left ||
          rect.right > bounds.right ||
          rect.top < bounds.top ||
          rect.bottom > bounds.bottom);
      const collides =
        outside ||
        blocked.some((other) => overlaps(rect, other)) ||
        kept.some((other) => overlaps(rect, other)) ||
        pins.some((pin) => pin !== candidate.pin && overlaps(rect, pin));
      if (!collides) {
        chosen = anchor;
        kept.push(rect);
        break;
      }
    }
    placed.set(candidate.id, chosen);
  }
  return placed;
}
