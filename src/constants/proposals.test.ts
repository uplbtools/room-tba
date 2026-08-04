import { describe, expect, test } from "bun:test";
import {
  MAX_SUBMITTER_NAME_LENGTH,
  MAX_SUBMITTER_NOTE_LENGTH,
  MIN_SUBMITTER_NAME_LENGTH,
  validateSubmitterName,
  validateSubmitterNote,
} from "./proposals";

describe("validateSubmitterName", () => {
  test("accepts a normal name", () => {
    const result = validateSubmitterName("  Ana  ");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.name).toBe("Ana");
  });

  test("rejects empty", () => {
    const result = validateSubmitterName(" ");
    expect(result.ok).toBe(false);
  });

  test("rejects too short", () => {
    const result = validateSubmitterName("a");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain(String(MIN_SUBMITTER_NAME_LENGTH));
    }
  });

  test("rejects too long", () => {
    const result = validateSubmitterName(
      "x".repeat(MAX_SUBMITTER_NAME_LENGTH + 1),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain(String(MAX_SUBMITTER_NAME_LENGTH));
    }
  });

  test("accepts max length", () => {
    const result = validateSubmitterName("x".repeat(MAX_SUBMITTER_NAME_LENGTH));
    expect(result.ok).toBe(true);
  });
});

describe("validateSubmitterNote (#873)", () => {
  test("treats blank as no note rather than an error", () => {
    const result = validateSubmitterNote("   ");
    expect(result).toEqual({ ok: true, note: null });
  });

  test("trims an actual note", () => {
    const result = validateSubmitterNote("  Please remove this room.  ");
    expect(result).toEqual({ ok: true, note: "Please remove this room." });
  });

  test("rejects a note past the cap", () => {
    const result = validateSubmitterNote(
      "x".repeat(MAX_SUBMITTER_NOTE_LENGTH + 1),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain(String(MAX_SUBMITTER_NOTE_LENGTH));
    }
  });
});
