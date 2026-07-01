export type ShortcutsPanelBounds = {
  left: number;
  top: number;
  right: number;
};

export type ShortcutsPanelLayoutInput = {
  viewportWidth: number;
  viewportHeight: number;
  triggerRect:
    | DOMRectReadOnly
    | { left: number; top: number; right: number; bottom: number };
  sidePanel: ShortcutsPanelBounds | null;
  margin?: number;
  triggerGap?: number;
  maxPanelWidth?: number;
  maxPanelHeight?: number;
};

export type ShortcutsPanelLayout = {
  left: number;
  bottom: number;
  width: number;
  maxHeight: number;
};

const DEFAULT_MARGIN = 8;
const DEFAULT_TRIGGER_GAP = 8;
const DEFAULT_MAX_WIDTH = 18 * 16;
const DEFAULT_MAX_HEIGHT = 20 * 16;

/** Anchor shortcuts help above the status bar; stay in the map column when the drawer is open. */
export function computeShortcutsPanelLayout(
  input: ShortcutsPanelLayoutInput,
): ShortcutsPanelLayout {
  const margin = input.margin ?? DEFAULT_MARGIN;
  const triggerGap = input.triggerGap ?? DEFAULT_TRIGGER_GAP;
  const maxPanelWidth = input.maxPanelWidth ?? DEFAULT_MAX_WIDTH;
  const maxPanelHeight = input.maxPanelHeight ?? DEFAULT_MAX_HEIGHT;
  const { viewportWidth, viewportHeight, triggerRect, sidePanel } = input;

  const bottom = Math.max(
    margin,
    viewportHeight - triggerRect.top + triggerGap,
  );

  let left: number;
  let width: number;

  if (sidePanel) {
    const mapLeft = sidePanel.right + margin;
    const mapRight = viewportWidth - margin;
    const mapWidth = Math.max(0, mapRight - mapLeft);
    if (mapWidth >= 12 * 16) {
      width = Math.min(maxPanelWidth, mapWidth);
      left =
        mapWidth > width
          ? mapLeft + (mapWidth - width) / 2
          : Math.min(mapLeft, Math.max(margin, mapRight - width));
    } else {
      width = Math.min(maxPanelWidth, viewportWidth - margin * 2);
      left = Math.max(margin, (viewportWidth - width) / 2);
    }
  } else {
    width = Math.min(maxPanelWidth, viewportWidth - margin * 2);
    left = Math.min(
      Math.max(margin, triggerRect.left),
      viewportWidth - width - margin,
    );
  }

  const contentTop = sidePanel?.top ?? margin;
  let maxHeight = Math.min(
    maxPanelHeight,
    viewportHeight - bottom - margin,
    Math.max(0, triggerRect.top - triggerGap - contentTop),
  );

  if (sidePanel) {
    const mapLeft = sidePanel.right + margin;
    const mapRight = viewportWidth - margin;
    const mapWidth = Math.max(0, mapRight - mapLeft);
    if (mapWidth < 12 * 16) {
      const mapBandHeight = Math.max(
        0,
        triggerRect.top - triggerGap - sidePanel.top,
      );
      maxHeight = Math.min(maxHeight, mapBandHeight);
    }
  }

  return { left, bottom, width, maxHeight };
}

export function formatShortcutsPanelStyle(
  layout: ShortcutsPanelLayout,
): string {
  return `left: ${layout.left}px; bottom: ${layout.bottom}px; width: ${layout.width}px; max-height: ${layout.maxHeight}px;`;
}

/** Measure open side-panel chrome so the shortcuts sheet can avoid covering it. */
export function measureOpenSidePanelBounds(): ShortcutsPanelBounds | null {
  if (typeof document === "undefined") return null;

  const drawer = document.querySelector(".drawer:not(.is-collapsed)");
  if (!(drawer instanceof HTMLElement)) return null;

  const details = drawer.querySelector("#side-panel-details");
  if (details?.getAttribute("aria-hidden") === "true") return null;

  const drawerRect = drawer.getBoundingClientRect();
  if (drawerRect.width <= 0 || drawerRect.height <= 0) return null;

  const handle = drawer.querySelector(".drawer-handle");
  const handleRect =
    handle instanceof HTMLElement ? handle.getBoundingClientRect() : drawerRect;

  return {
    left: drawerRect.left,
    top: drawerRect.top,
    right: Math.max(drawerRect.right, handleRect.right),
  };
}
