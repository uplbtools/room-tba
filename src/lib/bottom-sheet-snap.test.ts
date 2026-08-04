import { describe, expect, test } from "bun:test";
import {
  resolveBottomSheetRelease,
  sheetTranslateY,
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
