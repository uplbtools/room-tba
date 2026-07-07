import { describe, expect, test } from "bun:test";
import { clampLimitParam, clampOffsetParam } from "./pagination";

describe("pagination params", () => {
  test("uses default limit when omitted", () => {
    expect(clampLimitParam(null, { defaultValue: 50, max: 100 })).toEqual({
      ok: true,
      value: 50,
    });
  });

  test("caps inflated limits at the endpoint max", () => {
    expect(clampLimitParam("1000000", { defaultValue: 50, max: 100 })).toEqual({
      ok: true,
      value: 100,
    });
  });

  test("rejects invalid limit and offset values", () => {
    expect(clampLimitParam("many", { defaultValue: 50, max: 100 })).toEqual({
      ok: false,
      error: "limit must be a non-negative integer",
    });
    expect(clampOffsetParam("-1")).toEqual({
      ok: false,
      error: "offset must be a non-negative integer",
    });
  });
});
