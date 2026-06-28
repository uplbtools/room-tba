import { describe, expect, test } from "bun:test";
import { parseRequiredEditorVersion } from "./expected-version";

describe("parseRequiredEditorVersion", () => {
  test("accepts integer versions", () => {
    expect(parseRequiredEditorVersion(3)).toEqual({ ok: true, version: 3 });
  });

  test("rejects missing or non-integer versions", () => {
    for (const value of [undefined, null, 1.5, "2", NaN]) {
      const result = parseRequiredEditorVersion(value);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.response.status).toBe(400);
      }
    }
  });
});
