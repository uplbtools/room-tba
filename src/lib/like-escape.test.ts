import { describe, expect, test } from "bun:test";
import { escapeLikePattern } from "./like-escape";

describe("escapeLikePattern", () => {
  test("leaves an ordinary room code untouched", () => {
    expect(escapeLikePattern("CAS 101")).toBe("CAS 101");
  });

  test("escapes the LIKE wildcards so they match literally", () => {
    expect(escapeLikePattern("100%")).toBe("100\\%");
    expect(escapeLikePattern("PS_B")).toBe("PS\\_B");
  });

  test("escapes backslash", () => {
    expect(escapeLikePattern("a\\b")).toBe("a\\\\b");
  });

  // The bug this file exists for. Escaping backslash last re-escapes the
  // backslashes that escaping % and _ just added, so "100%" would come out as
  // "100\\%", a literal backslash followed by a wildcard, matching the wrong
  // rows or none.
  test("escapes backslash before the wildcards, not after", () => {
    expect(escapeLikePattern("100%")).not.toContain("\\\\%");
    expect(escapeLikePattern("a_b")).not.toContain("\\\\_");
  });

  test("handles a string carrying all three at once", () => {
    expect(escapeLikePattern("a\\b%c_d")).toBe("a\\\\b\\%c\\_d");
  });

  test("is a no-op on empty input", () => {
    expect(escapeLikePattern("")).toBe("");
  });
});
