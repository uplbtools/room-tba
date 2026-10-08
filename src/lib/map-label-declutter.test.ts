import { describe, expect, test } from "bun:test";
import {
  labelRectAt,
  placeLabels,
  type LabelCandidate,
} from "./map-label-declutter";

const rect = (left: number, top: number, width: number, height: number) => ({
  left,
  top,
  right: left + width,
  bottom: top + height,
});

const candidate = (
  id: number,
  priority: number,
  pin: ReturnType<typeof rect>,
  width = 100,
  height = 16,
): LabelCandidate => ({ id, priority, pin, width, height });

describe("labelRectAt", () => {
  test("right sits beside the pin, vertically centred", () => {
    expect(labelRectAt("right", rect(100, 100, 28, 28), 80, 16)).toEqual({
      left: 132,
      right: 212,
      top: 106,
      bottom: 122,
    });
  });

  test("top sits above the pin, horizontally centred", () => {
    expect(labelRectAt("top", rect(100, 100, 28, 28), 80, 16)).toEqual({
      left: 74,
      right: 154,
      top: 80,
      bottom: 96,
    });
  });
});

describe("placeLabels", () => {
  test("labels go to the right of their pin when there is room", () => {
    const a = candidate(1, 1, rect(0, 0, 28, 28));
    expect(placeLabels([a], [a.pin]).get(1)).toBe("right");
  });

  test("a label blocked on the right moves to the next free anchor", () => {
    const a = candidate(1, 1, rect(200, 100, 28, 28));
    // A neighbour pin just right of a, where its label would go.
    const neighbour = rect(240, 100, 28, 28);
    expect(placeLabels([a], [a.pin, neighbour]).get(1)).toBe("left");
  });

  test("labels never paint over another pin, whatever its rank", () => {
    const a = candidate(1, 1, rect(200, 100, 28, 28));
    const around = [
      rect(240, 100, 28, 28),
      rect(80, 100, 28, 28),
      rect(200, 140, 28, 28),
      rect(200, 60, 28, 28),
    ];
    expect(placeLabels([a], [a.pin, ...around]).get(1)).toBeNull();
  });

  test("the more important label wins a shared spot", () => {
    const office = candidate(1, 4, rect(0, 100, 28, 28));
    const building = candidate(2, 1, rect(0, 140, 28, 28), 100, 80);
    const placed = placeLabels([office, building], [office.pin, building.pin]);
    expect(placed.get(2)).toBe("right");
    // The building label (tall) covers the office's right; it tries on.
    expect(placed.get(1)).not.toBe("right");
  });

  test("a label that would run off the map edge flips inward", () => {
    const a = candidate(1, 1, rect(340, 200, 28, 28));
    const map = rect(0, 0, 390, 800);
    expect(placeLabels([a], [a.pin], [], map).get(1)).toBe("left");
  });

  test("hides labels under the search bar", () => {
    const a = candidate(1, 1, rect(10, 40, 28, 28));
    const placed = placeLabels([a], [a.pin], [rect(0, 0, 390, 110)]);
    expect(placed.get(1)).toBeNull();
  });

  test("never hides the selected place's label", () => {
    const selected = candidate(1, 0, rect(10, 40, 28, 28));
    const other = candidate(2, 1, rect(10, 40, 28, 28));
    const placed = placeLabels(
      [selected, other],
      [selected.pin, other.pin],
      [rect(0, 0, 390, 110)],
    );
    expect(placed.get(1)).toBe("right");
    expect(placed.get(2)).toBeNull();
  });
});
