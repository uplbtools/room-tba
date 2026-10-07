import { describe, expect, test } from "bun:test";
import { type Position, stopArrows } from "./route-arrows";

// A straight line heading north, then east.
const line: Position[] = [
  [121.24, 14.16],
  [121.24, 14.162],
  [121.243, 14.162],
];

describe("stopArrows", () => {
  test("one arrow after each stop except the last, pointing along the line", () => {
    const arrows = stopArrows(line, [
      { lat: 14.16, lon: 121.24 },
      { lat: 14.162, lon: 121.241 },
      { lat: 14.162, lon: 121.243 },
    ]);
    expect(arrows).toHaveLength(2);
    // First leg runs north.
    expect(Math.round(arrows[0].bearing)).toBe(0);
    expect(arrows[0].lat).toBeGreaterThan(14.16);
    // Second leg runs east.
    expect(Math.round(arrows[1].bearing)).toBe(90);
    expect(arrows[1].lon).toBeGreaterThan(121.241);
  });

  test("arrow stays short of a close next stop", () => {
    const [arrow] = stopArrows(line, [
      { lat: 14.16, lon: 121.24 },
      { lat: 14.1602, lon: 121.24 },
    ]);
    // Stops are ~22 m apart, so the arrow sits halfway, not 35 m along.
    expect(arrow.lat).toBeLessThan(14.1602);
  });

  test("a line that reuses a road in both directions keeps stop order", () => {
    const outAndBack: Position[] = [
      [121.24, 14.16],
      [121.24, 14.163],
      [121.24, 14.16],
    ];
    const arrows = stopArrows(outAndBack, [
      { lat: 14.161, lon: 121.24 },
      { lat: 14.163, lon: 121.24 },
      { lat: 14.1615, lon: 121.24 },
    ]);
    expect(Math.round(arrows[0].bearing)).toBe(0);
    expect(Math.round(arrows[1].bearing)).toBe(180);
  });

  test("nothing to draw without a line or a second stop", () => {
    expect(stopArrows([], [{ lat: 0, lon: 0 }])).toEqual([]);
    expect(stopArrows(line, [{ lat: 14.16, lon: 121.24 }])).toEqual([]);
  });
});
