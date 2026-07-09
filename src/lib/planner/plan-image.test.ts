import { describe, expect, test } from "bun:test";
import { packColumns, type PlanBlock } from "./plan-image";

function block(start: number, end: number): PlanBlock {
  return {
    day: 0,
    start,
    end,
    code: "X",
    section: "1",
    type: "LEC",
    room: null,
    color: "#000",
  };
}

describe("packColumns", () => {
  test("non-overlapping blocks share one column", () => {
    const a = block(600, 660);
    const b = block(660, 720); // starts exactly when a ends — no overlap
    const { columns, columnOf } = packColumns([a, b]);
    expect(columns).toBe(1);
    expect(columnOf.get(a)).toBe(0);
    expect(columnOf.get(b)).toBe(0);
  });

  test("two overlapping blocks take two columns", () => {
    const a = block(600, 720);
    const b = block(660, 780);
    const { columns } = packColumns([a, b]);
    expect(columns).toBe(2);
  });

  test("three mutually overlapping blocks take three columns", () => {
    const { columns } = packColumns([
      block(600, 700),
      block(620, 720),
      block(640, 740),
    ]);
    expect(columns).toBe(3);
  });

  test("a later non-overlapping block reuses a freed column", () => {
    const a = block(600, 660);
    const b = block(600, 660); // overlaps a -> forces 2 columns
    const c = block(700, 760); // after both -> reuses column 0
    const { columns, columnOf } = packColumns([a, b, c]);
    expect(columns).toBe(2);
    expect(columnOf.get(c)).toBe(0);
  });

  test("empty day yields one column", () => {
    expect(packColumns([]).columns).toBe(1);
  });
});
