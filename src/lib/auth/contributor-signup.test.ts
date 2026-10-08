import { describe, expect, test } from "bun:test";
import {
  MAX_PASSWORD_BYTES,
  MIN_CONTRIBUTOR_PASSWORD_LENGTH,
  newPasswordError,
  passwordByteLength,
  USERNAME_PATTERN_SOURCE,
  usernameError,
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

describe("password and username rules (auth audit item 16)", () => {
  test("byte length is UTF-8 aware", () => {
    expect(passwordByteLength("abc")).toBe(3);
    expect(passwordByteLength("é")).toBe(2);
    expect(passwordByteLength("😀")).toBe(4);
  });

  test("72 bytes is the cap bcrypt can actually use", () => {
    expect(newPasswordError("a".repeat(MAX_PASSWORD_BYTES))).toBeNull();
    expect(newPasswordError("a".repeat(MAX_PASSWORD_BYTES + 1))).toMatch(
      /72 bytes/,
    );
    // 20 emoji are 20 characters but 80 bytes.
    expect(newPasswordError("😀".repeat(20))).toMatch(/72 bytes/);
    expect(newPasswordError("short")).toMatch(/at least 10/);
  });

  test("signup rejects an over-long password", () => {
    const result = validateContributorSignup({
      username: "jane",
      password: "é".repeat(40),
    });
    expect(result.ok).toBe(false);
  });

  test("usernameError mirrors the signup rule", () => {
    expect(usernameError("jane.doe")).toBeNull();
    expect(usernameError("JANE")).toBeNull();
    expect(usernameError("ab")).toMatch(/3/);
    expect(usernameError("-jane")).not.toBeNull();
    expect(usernameError("jane doe")).not.toBeNull();
  });

  test("pattern attribute source compiles with the v flag browsers use", () => {
    const re = new RegExp(`^(?:${USERNAME_PATTERN_SOURCE})$`, "v");
    expect(re.test("jane_doe-1.x")).toBe(true);
    expect(re.test("_jane")).toBe(false);
  });
});
