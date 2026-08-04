import { describe, expect, test } from "bun:test";
import { ONLINE_WINDOW_SECONDS, isValidSid } from "./presence";

describe("isValidSid", () => {
  test("accepts a real crypto.randomUUID()", () => {
    expect(isValidSid(crypto.randomUUID())).toBe(true);
  });

  test("accepts the shortest and longest allowed ids", () => {
    expect(isValidSid("a".repeat(8))).toBe(true);
    expect(isValidSid("a".repeat(64))).toBe(true);
  });

  test("rejects ids outside the varchar(64) bounds", () => {
    expect(isValidSid("a".repeat(7))).toBe(false);
    expect(isValidSid("a".repeat(65))).toBe(false);
    expect(isValidSid("")).toBe(false);
  });

  test("rejects junk and injection-shaped input", () => {
    for (const junk of [
      "'; DROP TABLE presence; --",
      "../../etc/passwd",
      "<script>alert(1)</script>",
      "session id with spaces",
      "sid\nwith\nnewlines",
      "sid_with_underscore",
      "sid.with.dots",
      "🙂🙂🙂🙂🙂🙂🙂🙂",
    ]) {
      expect(isValidSid(junk)).toBe(false);
    }
  });

  test("rejects non-string bodies", () => {
    for (const notAString of [undefined, null, 42, {}, [], true]) {
      expect(isValidSid(notAString)).toBe(false);
    }
  });
});

describe("presence window", () => {
  test("is longer than the 30s client heartbeat so one miss is survivable", () => {
    expect(ONLINE_WINDOW_SECONDS).toBeGreaterThan(2 * 30);
  });
});
