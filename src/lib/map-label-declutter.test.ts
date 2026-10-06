import { describe, expect, test } from "bun:test";
import { labelsToHide, type LabelCandidate } from "./map-label-declutter";

const rect = (left: number, top: number, width: number, height: number) => ({
  left,
  top,
  right: left + width,
  bottom: top + height,
});

const candidate = (
  id: number,
  priority: number,
  label: ReturnType<typeof rect>,
  pin = rect(-100, -100, 28, 28),
): LabelCandidate => ({ id, priority, label, pin });

describe("labelsToHide", () => {
  test("keeps the higher-priority label when two overlap", () => {
    const hidden = labelsToHide([
      candidate(1, 4, rect(0, 0, 100, 20)),
      candidate(2, 1, rect(50, 10, 100, 20)),
    ]);
    expect([...hidden]).toEqual([1]);
  });

  test("hides a label that covers a more important pin", () => {
    const building = candidate(
      1,
      1,
      rect(300, 300, 80, 20),
      rect(120, 40, 28, 28),
    );
    const office = candidate(2, 4, rect(100, 30, 150, 20));
    expect([...labelsToHide([building, office])]).toEqual([2]);
  });

  test("hides labels under the search bar", () => {
    const hidden = labelsToHide(
      [candidate(1, 1, rect(10, 40, 100, 20))],
      [rect(0, 0, 390, 110)],
    );
    expect(hidden.has(1)).toBe(true);
  });

  test("never hides the selected place's label", () => {
    const hidden = labelsToHide(
      [
        candidate(1, 0, rect(10, 40, 100, 20)),
        candidate(2, 1, rect(10, 40, 100, 20)),
      ],
      [rect(0, 0, 390, 110)],
    );
    expect(hidden.has(1)).toBe(false);
    expect(hidden.has(2)).toBe(true);
  });

  test("leaves labels that only touch", () => {
    const hidden = labelsToHide([
      candidate(1, 1, rect(0, 0, 100, 20)),
      candidate(2, 1, rect(99, 0, 100, 20)),
    ]);
    expect(hidden.size).toBe(0);
  });
});
