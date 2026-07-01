import { describe, expect, test } from "bun:test";
import {
  computeShortcutsPanelLayout,
  formatShortcutsPanelStyle,
} from "./shortcuts-panel-position";

describe("computeShortcutsPanelLayout", () => {
  test("anchors above trigger with bottom positioning when drawer is closed", () => {
    const layout = computeShortcutsPanelLayout({
      viewportWidth: 1280,
      viewportHeight: 800,
      triggerRect: { left: 8, top: 760, right: 40, bottom: 784 },
      sidePanel: null,
    });

    expect(layout.bottom).toBe(48);
    expect(layout.left).toBe(8);
    expect(layout.width).toBe(288);
    expect(layout.maxHeight).toBeGreaterThan(0);
    expect(formatShortcutsPanelStyle(layout)).toContain("bottom: 48px");
  });

  test("centers in map column when side panel is open", () => {
    const layout = computeShortcutsPanelLayout({
      viewportWidth: 1280,
      viewportHeight: 800,
      triggerRect: { left: 8, top: 760, right: 40, bottom: 784 },
      sidePanel: { left: 8, top: 72, right: 520 },
    });

    const mapLeft = 520 + 8;
    const mapWidth = 1280 - 8 - mapLeft;
    const expectedLeft = mapLeft + (mapWidth - layout.width) / 2;

    expect(layout.left).toBeCloseTo(expectedLeft, 5);
    expect(layout.left).toBeGreaterThan(520);
    expect(layout.maxHeight).toBeLessThanOrEqual(760 - 8 - 72);
  });

  test("keeps panel within viewport on narrow mobile widths", () => {
    const layout = computeShortcutsPanelLayout({
      viewportWidth: 320,
      viewportHeight: 640,
      triggerRect: { left: 8, top: 600, right: 36, bottom: 624 },
      sidePanel: { left: 8, top: 120, right: 304 },
    });

    expect(layout.left + layout.width).toBeLessThanOrEqual(320 - 8);
    expect(layout.bottom).toBeGreaterThanOrEqual(8);
  });
});
