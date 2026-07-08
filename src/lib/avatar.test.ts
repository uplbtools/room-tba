import { describe, expect, test } from "bun:test";
import { nameInitials, nameColor } from "./avatar";

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
    expect(nameColor("someone")).toMatch(/^hsl\(\d+, 45%, 42%\)$/);
  });
});
