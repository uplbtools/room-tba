import { describe, expect, it } from "bun:test";
import {
  cameraFitDistance,
  isRoomLabelShown,
  pickNonOverlappingLabels,
  type LabelBox,
} from "./building-3d";

const label = (over: Partial<LabelBox> = {}): LabelBox => ({
  x: 0,
  y: 0,
  width: 40,
  height: 16,
  rank: 1,
  depth: 10,
  ...over,
});

describe("pickNonOverlappingLabels", () => {
  it("keeps labels that do not touch", () => {
    const kept = pickNonOverlappingLabels([
      label({ x: 0, y: 0 }),
      label({ x: 100, y: 0 }),
      label({ x: 0, y: 100 }),
    ]);
    expect(kept).toEqual([0, 1, 2]);
  });

  it("drops a label stacked on top of another", () => {
    // This is the viewer's actual bug: every room label drawn at once, several
    // of them landing on the same few pixels.
    const kept = pickNonOverlappingLabels([
      label({ x: 50, y: 50 }),
      label({ x: 52, y: 51 }),
      label({ x: 54, y: 52 }),
    ]);
    expect(kept).toHaveLength(1);
  });

  it("gives the space to the nearer label when two collide", () => {
    const kept = pickNonOverlappingLabels([
      label({ x: 50, y: 50, depth: 90 }),
      label({ x: 52, y: 50, depth: 5 }),
    ]);
    expect(kept).toEqual([1]);
  });

  it("lets a better rank beat a nearer label", () => {
    // Floor markers (rank 0) and the active room (rank -1) outrank room pins.
    const kept = pickNonOverlappingLabels([
      label({ x: 50, y: 50, depth: 1, rank: 1 }),
      label({ x: 52, y: 50, depth: 99, rank: -1 }),
    ]);
    expect(kept).toEqual([1]);
  });

  it("returns kept indices in input order", () => {
    const kept = pickNonOverlappingLabels([
      label({ x: 200, y: 0, depth: 30 }),
      label({ x: 0, y: 0, depth: 10 }),
      label({ x: 100, y: 0, depth: 20 }),
    ]);
    expect(kept).toEqual([0, 1, 2]);
  });

  it("treats edge-to-edge labels as clear", () => {
    const kept = pickNonOverlappingLabels([
      label({ x: 0, y: 0, width: 40 }),
      label({ x: 40, y: 0, width: 40 }),
    ]);
    expect(kept).toEqual([0, 1]);
  });

  it("handles an empty scene", () => {
    expect(pickNonOverlappingLabels([])).toEqual([]);
  });
});

describe("cameraFitDistance", () => {
  const base = { radius: 30, fovDeg: 45, width: 390, height: 750 };

  it("moves the camera back when a sheet covers part of the canvas", () => {
    const full = cameraFitDistance(base);
    const padded = cameraFitDistance({ ...base, padBottom: 450 });
    expect(padded).toBeGreaterThan(full);
  });

  it("fills the requested share of the narrower visible axis", () => {
    const d = cameraFitDistance({ ...base, width: 1000, padBottom: 350 });
    const tanHalf = Math.tan((45 * Math.PI) / 360);
    // Projected diameter as a share of the visible height (400px of 750).
    const share = (30 / d / tanHalf) * (750 / 400);
    expect(share).toBeCloseTo(0.65, 5);
  });

  it("never divides by a vanished visible area", () => {
    const d = cameraFitDistance({ ...base, padBottom: 10_000 });
    expect(Number.isFinite(d)).toBe(true);
  });
});

describe("isRoomLabelShown", () => {
  it("labels every room on the selected floor and none elsewhere", () => {
    expect(
      isRoomLabelShown({ floor: 1, selectedFloor: 1, focused: false }),
    ).toBe(true);
    expect(
      isRoomLabelShown({ floor: 2, selectedFloor: 1, focused: false }),
    ).toBe(false);
  });

  it("keeps all-floors to the picked room only", () => {
    expect(
      isRoomLabelShown({ floor: 2, selectedFloor: "all", focused: false }),
    ).toBe(false);
    expect(
      isRoomLabelShown({ floor: 2, selectedFloor: "all", focused: true }),
    ).toBe(true);
  });
});
