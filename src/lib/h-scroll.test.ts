import { describe, expect, test } from "bun:test";
import { pageScrollTarget, scrollEdges } from "./h-scroll";

const box = (scrollLeft: number, clientWidth = 200, scrollWidth = 500) => ({
  scrollLeft,
  clientWidth,
  scrollWidth,
});

// Five 90px pills with 10px gaps: 0–90, 100–190, 200–290, 300–390, 400–490.
const items = [0, 100, 200, 300, 400].map((offsetLeft) => ({
  offsetLeft,
  offsetWidth: 90,
}));

describe("scrollEdges", () => {
  test("no overflow means no fade on either side", () => {
    expect(scrollEdges(box(0, 300, 302))).toEqual({
      back: false,
      more: false,
    });
  });

  test("start, middle and end of an overflowing row", () => {
    expect(scrollEdges(box(0))).toEqual({ back: false, more: true });
    expect(scrollEdges(box(150))).toEqual({ back: true, more: true });
    expect(scrollEdges(box(300))).toEqual({ back: true, more: false });
  });
});

describe("pageScrollTarget", () => {
  test("forward lands the first cut-off pill just inside the left fade", () => {
    // View 0–200: the 100–190 pill already runs into the right fade (176+).
    expect(pageScrollTarget(box(0), items, 1, 24)).toBe(100 - 24);
  });

  test("back lands the pill cut off on the left just inside the right fade", () => {
    // View 250–450: the 200–290 pill is cut off on the left.
    expect(pageScrollTarget(box(250), items, -1, 24)).toBe(290 - 200 + 24);
  });

  test("never goes below zero", () => {
    expect(pageScrollTarget(box(10), items, -1, 24)).toBe(0);
  });
});
