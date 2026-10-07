import { describe, expect, test } from "bun:test";
import { pointsBounds } from "./map-fit";

describe("pointsBounds", () => {
  test("boxes every point", () => {
    expect(
      pointsBounds([
        [121.24, 14.16],
        [121.25, 14.15],
        [121.23, 14.17],
      ]),
    ).toEqual([
      [121.23, 14.15],
      [121.25, 14.17],
    ]);
  });

  test("a single point is a zero-size box", () => {
    expect(pointsBounds([[121.24, 14.16]])).toEqual([
      [121.24, 14.16],
      [121.24, 14.16],
    ]);
  });

  test("no usable points means nothing to fit", () => {
    expect(pointsBounds([])).toBeNull();
    expect(pointsBounds([[Number.NaN, 14.16]])).toBeNull();
  });
});
