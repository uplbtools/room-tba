import { describe, expect, test } from "bun:test";
import { resolveSheetDragReleaseIntent } from "./sheet-drag-intent";

const base = { followThreshold: 4, flickVelocity: 0.5 };

describe("resolveSheetDragReleaseIntent", () => {
  test("flick down collapses regardless of distance", () => {
    expect(
      resolveSheetDragReleaseIntent({
        ...base,
        delta: 1,
        velocity: 0.6,
        collapsed: false,
      }),
    ).toBe("collapse");
  });

  test("flick up expands regardless of distance", () => {
    expect(
      resolveSheetDragReleaseIntent({
        ...base,
        delta: -1,
        velocity: 0.6,
        collapsed: true,
      }),
    ).toBe("expand");
  });

  test("collapsed sheet dragged up past the follow threshold expands", () => {
    expect(
      resolveSheetDragReleaseIntent({
        ...base,
        delta: -10,
        velocity: 0.1,
        collapsed: true,
      }),
    ).toBe("expand");
  });

  test("collapsed sheet dragged up under the follow threshold stays put", () => {
    expect(
      resolveSheetDragReleaseIntent({
        ...base,
        delta: -2,
        velocity: 0.1,
        collapsed: true,
      }),
    ).toBe("none");
  });

  test("expanded sheet dragged down past the follow threshold collapses", () => {
    expect(
      resolveSheetDragReleaseIntent({
        ...base,
        delta: 10,
        velocity: 0.1,
        collapsed: false,
      }),
    ).toBe("collapse");
  });

  test("expanded sheet dragged down under the follow threshold stays put", () => {
    expect(
      resolveSheetDragReleaseIntent({
        ...base,
        delta: 2,
        velocity: 0.1,
        collapsed: false,
      }),
    ).toBe("none");
  });

  test("collapsed sheet dragged down (wrong direction) stays put", () => {
    expect(
      resolveSheetDragReleaseIntent({
        ...base,
        delta: 10,
        velocity: 0.1,
        collapsed: true,
      }),
    ).toBe("none");
  });
});
