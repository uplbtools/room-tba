import { describe, expect, test } from "bun:test";
import { checkRateLimit, resetRateLimitsForTests } from "./rate-limit";

describe("checkRateLimit", () => {
  test("allows requests under the cap", () => {
    resetRateLimitsForTests();
    const first = checkRateLimit("ip:1", 3, 60_000, 1_000);
    expect(first.allowed).toBe(true);
    expect(first.remaining).toBe(2);
  });

  test("blocks once the cap is exceeded", () => {
    resetRateLimitsForTests();
    checkRateLimit("ip:2", 2, 60_000, 1_000);
    checkRateLimit("ip:2", 2, 60_000, 1_000);
    const third = checkRateLimit("ip:2", 2, 60_000, 1_000);
    expect(third.allowed).toBe(false);
  });

  test("resets after the window expires", () => {
    resetRateLimitsForTests();
    checkRateLimit("ip:3", 1, 60_000, 1_000);
    const blocked = checkRateLimit("ip:3", 1, 60_000, 2_000);
    expect(blocked.allowed).toBe(false);
    const afterWindow = checkRateLimit("ip:3", 1, 60_000, 62_001);
    expect(afterWindow.allowed).toBe(true);
  });
});
