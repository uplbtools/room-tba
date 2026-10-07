/** Screen rectangle in CSS pixels (a DOMRect subset). */
export type LabelRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export type LabelCandidate = {
  id: number;
  /** Lower draws first and wins collisions. 0 = never hidden (selected). */
  priority: number;
  label: LabelRect;
  pin: LabelRect;
};

/** Slack so labels that only kiss at their rounded corners both stay. */
const GAP_PX = 2;

function overlaps(a: LabelRect, b: LabelRect): boolean {
  return (
    a.left < b.right - GAP_PX &&
    b.left < a.right - GAP_PX &&
    a.top < b.bottom - GAP_PX &&
    b.top < a.bottom - GAP_PX
  );
}

/**
 * Which pin labels to hide so the ones left are readable. Greedy by priority:
 * a label stays unless it overlaps a label already kept, covers the pin of a
 * higher-priority place (an office's name sitting on its building's pin), or
 * falls under fixed chrome such as the search bar. Priority 0 always stays.
 */
export function labelsToHide(
  candidates: readonly LabelCandidate[],
  blocked: readonly LabelRect[] = [],
): Set<number> {
  const order = [...candidates].sort((a, b) => a.priority - b.priority);
  const kept: LabelRect[] = [];
  const hidden = new Set<number>();
  for (const candidate of order) {
    const collides =
      candidate.priority > 0 &&
      (blocked.some((rect) => overlaps(candidate.label, rect)) ||
        kept.some((rect) => overlaps(candidate.label, rect)) ||
        order.some(
          (other) =>
            other.id !== candidate.id &&
            other.priority < candidate.priority &&
            overlaps(candidate.label, other.pin),
        ));
    if (collides) hidden.add(candidate.id);
    else kept.push(candidate.label);
  }
  return hidden;
}
