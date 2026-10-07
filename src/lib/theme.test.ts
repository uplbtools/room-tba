import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { contrastRatio, contrastWithWhite } from "./color-contrast";
import {
  DARK_THEME_TOKENS as T,
  THEME_STORAGE_KEY,
  darkThemeCss,
  parseThemePreference,
  resolveTheme,
} from "./theme";

describe("theme preference", () => {
  test("unknown or missing values fall back to system", () => {
    expect(parseThemePreference(null)).toBe("system");
    expect(parseThemePreference("sepia")).toBe("system");
    expect(parseThemePreference("dark")).toBe("dark");
    expect(parseThemePreference("light")).toBe("light");
  });

  test("system follows prefers-color-scheme; explicit choices win", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  test("the pre-paint script in Layout.astro reads the same storage key", () => {
    const layout = readFileSync(
      join(import.meta.dir, "../layouts/Layout.astro"),
      "utf8",
    );
    expect(layout.includes(`"${THEME_STORAGE_KEY}"`)).toBe(true);
  });
});

describe("dark tokens meet WCAG AA", () => {
  const surfaces = [
    T.surface,
    T["surface-2"],
    T["surface-3"],
    T["accent-soft"],
  ];

  test.each(["text", "text-2", "text-muted", "accent-text"] as const)(
    "%s on every surface",
    (fg) => {
      for (const bg of surfaces) {
        expect(contrastRatio(T[fg], bg)).toBeGreaterThanOrEqual(4.5);
      }
    },
  );

  test("status hues on their own soft tint and on the base surface", () => {
    for (const hue of ["amber", "green", "blue", "purple"] as const) {
      const fg = T[`${hue}-text`];
      expect(contrastRatio(fg, T[`${hue}-soft`])).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(fg, T.surface)).toBeGreaterThanOrEqual(4.5);
    }
  });

  test("white text on the dark accent fill", () => {
    expect(contrastWithWhite(T["accent-fill"])).toBeGreaterThanOrEqual(4.5);
  });

  test("the maroon brand needs the lighter tint on dark", () => {
    expect(contrastRatio("#7b1113", T.surface)).toBeLessThan(3);
  });

  test("strong borders stay visible (3:1 non-text)", () => {
    expect(contrastRatio(T["border-strong"], T.surface)).toBeGreaterThanOrEqual(
      3,
    );
  });
});

describe("darkThemeCss", () => {
  test("defines every token, screen-only, scoped to app pages", () => {
    const css = darkThemeCss();
    expect(css.startsWith("@media screen{")).toBe(true);
    expect(css).toContain(':root[data-theme="dark"][data-app-page]');
    for (const name of Object.keys(T)) {
      expect(css).toContain(`--theme-${name}:`);
    }
  });
});
