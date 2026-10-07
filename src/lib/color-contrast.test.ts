import { describe, expect, test } from "bun:test";
import { contrastWithWhite, darkenForWhiteText } from "./color-contrast";

describe("darkenForWhiteText", () => {
  test("darkens light route colours to AA with white text", () => {
    for (const hex of ["#d97706", "#EF6C00", "#0891b2"]) {
      const out = darkenForWhiteText(hex);
      expect(contrastWithWhite(out)).toBeGreaterThanOrEqual(4.5);
    }
  });

  test("leaves colours that already pass alone", () => {
    expect(darkenForWhiteText("#7b1113")).toBe("#7b1113");
  });

  test("passes through non-hex values", () => {
    expect(darkenForWhiteText("var(--x)")).toBe("var(--x)");
  });
});
