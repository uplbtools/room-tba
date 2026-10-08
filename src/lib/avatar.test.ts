import { describe, expect, test } from "bun:test";
import { AVATAR_HUES, nameInitials, nameColor } from "./avatar";
import { contrastWithWhite } from "./color-contrast";

function hslToHex(h: number, s: number, l: number): string {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return `#${[0, 8, 4]
    .map((n) =>
      Math.round(f(n) * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

describe("nameInitials", () => {
  test("first + last initial for multi-word names", () => {
    expect(nameInitials("Juan Dela Cruz")).toBe("JC");
    expect(nameInitials("Ada Lovelace")).toBe("AL");
  });

  test("first two letters for a single word", () => {
    expect(nameInitials("stimmie")).toBe("ST");
  });

  test("falls back to ? for empty/blank", () => {
    expect(nameInitials("")).toBe("?");
    expect(nameInitials("   ")).toBe("?");
  });
});

describe("nameColor", () => {
  test("is deterministic for the same name", () => {
    expect(nameColor("Ada Lovelace")).toBe(nameColor("Ada Lovelace"));
  });

  test("returns an hsl color", () => {
    expect(nameColor("someone")).toMatch(/^hsl\(\d+, 50%, 32%\)$/);
  });

  test("white initials reach AA contrast on every hue", () => {
    for (const hue of AVATAR_HUES) {
      expect(
        contrastWithWhite(hslToHex(hue, 0.5, 0.32)),
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  test("spreads similar names across distinct colors", () => {
    const names = ["Ana", "Ann", "Anna", "Ben", "Bea", "Cara", "Carl", "Dan"];
    expect(new Set(names.map(nameColor)).size).toBeGreaterThanOrEqual(5);
  });
});
