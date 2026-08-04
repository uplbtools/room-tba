import { describe, expect, test } from "bun:test";
import {
  enforceFeedbackLimits,
  FEEDBACK_CONTACT_MAX,
  FEEDBACK_MAX_BODY_BYTES,
  FEEDBACK_MESSAGE_MAX,
  isFeedbackBodyTooLarge,
  validateFeedback,
} from "./feedback";
import { resetRateLimitsForTests } from "./rate-limit";

describe("validateFeedback", () => {
  test("accepts a message and trims it", () => {
    const result = validateFeedback({ message: "  the map is blank  " });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.message).toBe("the map is blank");
    expect(result.value.contact).toBeNull();
    expect(result.value.wasOnline).toBeNull();
  });

  test("rejects an empty or whitespace-only message with 400", () => {
    for (const message of ["", "   ", "\n\t"]) {
      const result = validateFeedback({ message });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.status).toBe(400);
    }
  });

  test("rejects a non-object body with 400", () => {
    for (const body of [null, undefined, "hello", 42, ["message"]]) {
      const result = validateFeedback(body);
      expect(result.ok).toBe(false);
    }
  });

  test("rejects an oversized message with 413", () => {
    const result = validateFeedback({
      message: "x".repeat(FEEDBACK_MESSAGE_MAX + 1),
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(413);
  });

  test("accepts a message exactly at the cap", () => {
    expect(
      validateFeedback({ message: "x".repeat(FEEDBACK_MESSAGE_MAX) }).ok,
    ).toBe(true);
  });

  test("truncates an overlong contact instead of failing the send", () => {
    const result = validateFeedback({
      message: "hi",
      contact: "a".repeat(FEEDBACK_CONTACT_MAX + 50),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.contact).toHaveLength(FEEDBACK_CONTACT_MAX);
  });

  test("keeps a same-site path but drops its query string", () => {
    const result = validateFeedback({
      message: "hi",
      screen: "/planner?term=1252&q=secret",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.screen).toBe("/planner");
  });

  test("drops a screen that is not a same-site path", () => {
    for (const screen of [
      "https://evil.example/x",
      "//evil.example",
      "javascript:alert(1)",
      "",
      123,
    ]) {
      const result = validateFeedback({ message: "hi", screen });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.screen).toBeNull();
    }
  });

  test("keeps wasOnline only when it is a real boolean", () => {
    const on = validateFeedback({ message: "hi", wasOnline: false });
    expect(on.ok && on.value.wasOnline).toBe(false);
    const bogus = validateFeedback({ message: "hi", wasOnline: "yes" });
    expect(bogus.ok && bogus.value.wasOnline).toBeNull();
  });
});

describe("isFeedbackBodyTooLarge", () => {
  test("allows a missing or normal Content-Length", () => {
    expect(isFeedbackBodyTooLarge(null)).toBe(false);
    expect(isFeedbackBodyTooLarge("512")).toBe(false);
    expect(isFeedbackBodyTooLarge(String(FEEDBACK_MAX_BODY_BYTES))).toBe(false);
  });

  test("rejects a declared body over the cap", () => {
    expect(isFeedbackBodyTooLarge(String(FEEDBACK_MAX_BODY_BYTES + 1))).toBe(
      true,
    );
  });
});

describe("enforceFeedbackLimits", () => {
  test("allows the first few messages from one IP", () => {
    resetRateLimitsForTests();
    const now = 5_000_000;
    for (let i = 0; i < 5; i += 1) {
      expect(enforceFeedbackLimits("198.51.100.10", now)).toBeNull();
    }
  });

  test("blocks the next message from the same IP", () => {
    resetRateLimitsForTests();
    const now = 6_000_000;
    for (let i = 0; i < 5; i += 1) {
      enforceFeedbackLimits("198.51.100.11", now);
    }
    const blocked = enforceFeedbackLimits("198.51.100.11", now);
    expect(blocked).not.toBeNull();
    expect(blocked?.resetAt).toBeGreaterThan(now);
  });

  test("does not let one IP's burst block another", () => {
    resetRateLimitsForTests();
    const now = 7_000_000;
    for (let i = 0; i < 6; i += 1) {
      enforceFeedbackLimits("198.51.100.12", now);
    }
    expect(enforceFeedbackLimits("198.51.100.13", now)).toBeNull();
  });

  test("lets the short window recover but keeps the daily cap", () => {
    resetRateLimitsForTests();
    const start = 8_000_000;
    const shortWindowMs = 10 * 60 * 1000;
    let blockedAt: number | null = null;
    // 25/day at 5 per 10-minute window = the daily cap bites on the 6th window.
    for (let window = 0; window < 6; window += 1) {
      const now = start + window * shortWindowMs;
      for (let i = 0; i < 5; i += 1) {
        if (enforceFeedbackLimits("198.51.100.14", now) && blockedAt === null) {
          blockedAt = window;
        }
      }
    }
    expect(blockedAt).toBe(5);
  });
});
