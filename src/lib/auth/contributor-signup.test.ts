import { describe, expect, test } from "bun:test";
import {
  MIN_CONTRIBUTOR_PASSWORD_LENGTH,
  validateContributorSignup,
} from "./contributor-signup";

const goodPassword = "x".repeat(MIN_CONTRIBUTOR_PASSWORD_LENGTH);

describe("validateContributorSignup", () => {
  test("accepts a valid contributor and normalizes username/email", () => {
    const result = validateContributorSignup({
      username: "  Jane.Doe ",
      password: goodPassword,
      email: "  Jane@Example.COM ",
    });
    expect(result).toEqual({
      ok: true,
      username: "jane.doe",
      password: goodPassword,
      email: "jane@example.com",
      displayName: null,
    });
  });

  test("email is optional", () => {
    const result = validateContributorSignup({
      username: "jane",
      password: goodPassword,
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.email).toBeNull();
  });

  test("blank email is treated as omitted", () => {
    const result = validateContributorSignup({
      username: "jane",
      password: goodPassword,
      email: "   ",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.email).toBeNull();
  });

  test.each([
    ["missing username", { password: goodPassword }],
    ["missing password", { username: "jane" }],
    ["too short", { username: "ab", password: goodPassword }],
    ["too long", { username: "a".repeat(33), password: goodPassword }],
    ["leading symbol", { username: "-jane", password: goodPassword }],
    ["illegal chars", { username: "jane doe!", password: goodPassword }],
  ])("rejects %s", (_label, input) => {
    const result = validateContributorSignup(input);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(400);
  });

  test("rejects a weak (too short) password", () => {
    const result = validateContributorSignup({
      username: "jane",
      password: "x".repeat(MIN_CONTRIBUTOR_PASSWORD_LENGTH - 1),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/at least/i);
  });

  test("rejects a malformed email", () => {
    const result = validateContributorSignup({
      username: "jane",
      password: goodPassword,
      email: "not-an-email",
    });
    expect(result.ok).toBe(false);
  });

  test("uppercase in the username is folded, not rejected", () => {
    const result = validateContributorSignup({
      username: "JANE",
      password: goodPassword,
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.username).toBe("jane");
  });
});
