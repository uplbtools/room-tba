import { describe, it, expect } from "bun:test";
import { normalizeRoomCode, canonicalKey } from "@lib/normalize-room-code";

describe("normalizeRoomCode", () => {
  it("trims whitespace", () => {
    expect(normalizeRoomCode("  ABC 123  ")).toBe("ABC 123");
  });

  it("uppercases", () => {
    expect(normalizeRoomCode("abc 123")).toBe("ABC 123");
  });

  it("collapses mixed separators to single space", () => {
    expect(normalizeRoomCode("ABC_123-LAB")).toBe("ABC 123 LAB");
    expect(normalizeRoomCode("ABC  123")).toBe("ABC 123");
  });
});

describe("canonicalKey", () => {
  it("strips all separators for dedup", () => {
    expect(canonicalKey("ABC 123a")).toBe("ABC123A");
    expect(canonicalKey("ABC_123A")).toBe("ABC123A");
    expect(canonicalKey("abc-123a")).toBe("ABC123A");
    expect(canonicalKey("ABC.123A")).toBe("ABC123A");
  });

  it("matches equivalent variants", () => {
    expect(canonicalKey("PhySci C-128")).toBe("PHYSCIC128");
    expect(canonicalKey("PHYSCI_C128")).toBe("PHYSCIC128");
  });
});
