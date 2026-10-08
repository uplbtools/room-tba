import { describe, expect, test } from "bun:test";
import {
  checkRateLimit,
  clientIp,
  resetRateLimitsForTests,
} from "./rate-limit";

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

describe("clientIp", () => {
  const req = (headers: Record<string, string>) =>
    new Request("https://example.test/api", { headers });

  test("prefers the Vercel-set header", () => {
    expect(
      clientIp(
        req({
          "x-vercel-forwarded-for": "198.51.100.7",
          "x-real-ip": "198.51.100.8",
          "x-forwarded-for": "203.0.113.1, 198.51.100.7",
        }),
      ),
    ).toBe("198.51.100.7");
  });

  test("falls back to x-real-ip", () => {
    expect(clientIp(req({ "x-real-ip": "198.51.100.8" }))).toBe("198.51.100.8");
  });

  test("never trusts the client-typed first X-Forwarded-For entry", () => {
    expect(clientIp(req({ "x-forwarded-for": "203.0.113.1" }))).toBe("unknown");
  });
});
