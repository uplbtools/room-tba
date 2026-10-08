import { describe, expect, test } from "bun:test";
import {
  neighbourSnap,
  resolveBottomSheetRelease,
  resolveSnapRelease,
  sheetTranslateY,
  snapHeight,
  snapOrder,
} from "./bottom-sheet-snap";

const base = {
  followThreshold: 40,
  dismissThreshold: 80,
  flickVelocity: 0.5,
};

describe("resolveBottomSheetRelease", () => {
  test("peek + drag up past threshold expands", () => {
    expect(
      resolveBottomSheetRelease({
        ...base,
        snap: "peek",
        delta: -50,
        velocity: 0.1,
      }),
    ).toBe("expand");
  });

  test("peek + drag down past dismiss threshold dismisses", () => {
    expect(
      resolveBottomSheetRelease({
        ...base,
        snap: "peek",
        delta: 100,
        velocity: 0.1,
      }),
    ).toBe("dismiss");
  });

  test("peek + small drag stays", () => {
    expect(
      resolveBottomSheetRelease({
        ...base,
        snap: "peek",
        delta: -10,
        velocity: 0.1,
      }),
    ).toBe("none");
  });

  test("peek + flick down dismisses", () => {
    expect(
      resolveBottomSheetRelease({
        ...base,
        snap: "peek",
        delta: 8,
        velocity: 0.7,
      }),
    ).toBe("dismiss");
  });

  test("expanded + drag down goes to peek", () => {
    expect(
      resolveBottomSheetRelease({
        ...base,
        snap: "expanded",
        delta: 50,
        velocity: 0.1,
      }),
    ).toBe("peek");
  });

  test("expanded + flick down goes to peek", () => {
    expect(
      resolveBottomSheetRelease({
        ...base,
        snap: "expanded",
        delta: 5,
        velocity: 0.7,
      }),
    ).toBe("peek");
  });
});

describe("sheetTranslateY", () => {
  test("full-height visible has no offset", () => {
    expect(sheetTranslateY(800, 800)).toBe(0);
  });

  test("peek offsets by the hidden portion", () => {
    expect(sheetTranslateY(400, 800)).toBe(400);
  });
});

describe("resolveSnapRelease (peek, half, full)", () => {
  const heights = { peek: 200, half: 420, expanded: 700 };
  const args = {
    heights,
    followThreshold: 40,
    dismissThreshold: 80,
    flickVelocity: 0.5,
  };

  test("a short pull up from peek still advances to half", () => {
    expect(
      resolveSnapRelease({ ...args, snap: "peek", delta: -60, velocity: 0.1 }),
    ).toBe("half");
  });

  test("a long pull up from peek lands on full", () => {
    expect(
      resolveSnapRelease({ ...args, snap: "peek", delta: -480, velocity: 0.1 }),
    ).toBe("expanded");
  });

  test("a tiny drag stays put", () => {
    expect(
      resolveSnapRelease({ ...args, snap: "half", delta: -15, velocity: 0.1 }),
    ).toBe("none");
  });

  test("half pulled down moves to peek, up moves to full", () => {
    expect(
      resolveSnapRelease({ ...args, snap: "half", delta: 120, velocity: 0.1 }),
    ).toBe("peek");
    expect(
      resolveSnapRelease({ ...args, snap: "half", delta: -150, velocity: 0.1 }),
    ).toBe("expanded");
  });

  test("a flick moves exactly one stop", () => {
    expect(
      resolveSnapRelease({ ...args, snap: "peek", delta: -10, velocity: 0.9 }),
    ).toBe("half");
    expect(
      resolveSnapRelease({
        ...args,
        snap: "expanded",
        delta: 10,
        velocity: 0.9,
      }),
    ).toBe("half");
  });

  test("dragging below peek dismisses, by distance or by flick", () => {
    expect(
      resolveSnapRelease({ ...args, snap: "peek", delta: 100, velocity: 0.1 }),
    ).toBe("dismiss");
    expect(
      resolveSnapRelease({ ...args, snap: "peek", delta: 6, velocity: 0.9 }),
    ).toBe("dismiss");
  });

  test("without a half stop it behaves as two stops", () => {
    expect(
      resolveSnapRelease({
        ...args,
        heights: { peek: 200, expanded: 700 },
        snap: "peek",
        delta: -60,
        velocity: 0.1,
      }),
    ).toBe("expanded");
  });
});

describe("snapOrder, neighbourSnap and snapHeight", () => {
  test("order depends on whether a half stop exists", () => {
    expect(snapOrder({ peek: 1, expanded: 3 })).toEqual(["peek", "expanded"]);
    expect(snapOrder({ peek: 1, half: 2, expanded: 3 })).toEqual([
      "peek",
      "half",
      "expanded",
    ]);
    expect(neighbourSnap("expanded", 1, { peek: 1, expanded: 3 })).toBeNull();
    expect(neighbourSnap("peek", 1, { peek: 1, half: 2, expanded: 3 })).toBe(
      "half",
    );
  });

  test("a missing half resolves to peek height", () => {
    expect(snapHeight("half", { peek: 120, expanded: 600 })).toBe(120);
    expect(snapHeight("expanded", { peek: 120, expanded: 600 })).toBe(600);
  });
});
