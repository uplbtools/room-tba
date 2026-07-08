import { describe, expect, test } from "bun:test";
import { resolveDrawerDragIntent } from "./drawer-drag";

describe("resolveDrawerDragIntent", () => {
  test("dragging down past the threshold collapses", () => {
    expect(resolveDrawerDragIntent(60)).toBe("collapse");
    expect(resolveDrawerDragIntent(40)).toBe("collapse");
  });

  test("dragging up past the threshold expands", () => {
    expect(resolveDrawerDragIntent(-60)).toBe("expand");
    expect(resolveDrawerDragIntent(-40)).toBe("expand");
  });

  test("small movements are taps, not swipes", () => {
    expect(resolveDrawerDragIntent(0)).toBe("none");
    expect(resolveDrawerDragIntent(10)).toBe("none");
    expect(resolveDrawerDragIntent(-30)).toBe("none");
  });

  test("honors a custom threshold", () => {
    expect(resolveDrawerDragIntent(20, 15)).toBe("collapse");
    expect(resolveDrawerDragIntent(20, 25)).toBe("none");
  });
});
