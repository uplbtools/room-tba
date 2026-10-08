/**
 * Horizontal scroller helpers shared by the map filter chip row and the place
 * sheet's action pills: which edges hide more content (for edge fades and
 * chevrons), and where a chevron press should land so it pages by whole
 * items instead of stopping mid-pill.
 */

type ScrollBox = Pick<
  HTMLElement,
  "scrollLeft" | "scrollWidth" | "clientWidth"
>;
type Item = Pick<HTMLElement, "offsetLeft" | "offsetWidth">;

/** Slack for subpixel layout: a 1px overflow is not "more". */
const SLOP_PX = 4;

export function scrollEdges(el: ScrollBox): { back: boolean; more: boolean } {
  const overflow = el.scrollWidth > el.clientWidth + SLOP_PX;
  return {
    back: overflow && el.scrollLeft > SLOP_PX,
    more: overflow && el.scrollLeft + el.clientWidth < el.scrollWidth - SLOP_PX,
  };
}

/**
 * scrollLeft for one page in `direction`. Forward brings the first item cut
 * off on the right to just inside the left edge fade (`edgePx`); back brings
 * the item cut off on the left to just inside the right fade.
 */
export function pageScrollTarget(
  el: ScrollBox,
  items: readonly Item[],
  direction: 1 | -1,
  edgePx: number,
): number {
  const viewStart = el.scrollLeft;
  const viewEnd = viewStart + el.clientWidth;
  if (direction === 1) {
    const next = items.find(
      (c) => c.offsetLeft + c.offsetWidth > viewEnd - edgePx + 1,
    );
    return Math.max(0, next ? next.offsetLeft - edgePx : el.scrollWidth);
  }
  const prev = [...items]
    .reverse()
    .find((c) => c.offsetLeft < viewStart + edgePx - 1);
  return Math.max(
    0,
    prev ? prev.offsetLeft + prev.offsetWidth - el.clientWidth + edgePx : 0,
  );
}

/**
 * Mice and trackpads scroll vertically by default; turn a mostly vertical
 * wheel over an overflowing row into a sideways pan. Returns true when it
 * handled the event.
 */
export function wheelToHorizontal(el: HTMLElement, event: WheelEvent): boolean {
  if (el.scrollWidth <= el.clientWidth + SLOP_PX) return false;
  if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return false;
  event.preventDefault();
  el.scrollLeft += event.deltaY;
  return true;
}
