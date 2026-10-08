import { describe, expect, test } from "bun:test";
import {
  OUTBOX_MAX_ATTEMPTS,
  outboxOutcome,
  outboxRetryDelayMs,
} from "./outbox-core";

describe("outbox retry policy", () => {
  test("backs off exponentially from one minute, capped at six hours", () => {
    expect(outboxRetryDelayMs(1)).toBe(60_000);
    expect(outboxRetryDelayMs(2)).toBe(120_000);
    expect(outboxRetryDelayMs(4)).toBe(480_000);
    expect(outboxRetryDelayMs(30)).toBe(6 * 60 * 60 * 1000);
  });

  test("success is sent; failure schedules a retry until the cap", () => {
    const now = new Date("2026-10-08T00:00:00Z");
    expect(outboxOutcome(true, 3, now)).toEqual({ status: "sent" });
    expect(outboxOutcome(false, 1, now)).toEqual({
      status: "pending",
      nextAttemptAt: new Date(now.getTime() + 60_000),
    });
    expect(outboxOutcome(false, OUTBOX_MAX_ATTEMPTS, now)).toEqual({
      status: "dead",
    });
  });
});
