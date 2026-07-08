import { describe, expect, test } from "bun:test";
import { termChipLabel, termFullLabel } from "./term-label";

const term = (over: Partial<Parameters<typeof termFullLabel>[0]>) => ({
  label: "AY 2026-2027 1st sem",
  semester: "1",
  schoolYear: "2026-2027",
  ...over,
});

describe("termFullLabel", () => {
  test("appends the academic year with spaced dash", () => {
    expect(termFullLabel(term({}))).toBe("1st sem AY 2026 - 2027");
    expect(termFullLabel(term({ semester: "2" }))).toBe(
      "2nd sem AY 2026 - 2027",
    );
    expect(termFullLabel(term({ semester: "midyear" }))).toBe(
      "Midyear AY 2026 - 2027",
    );
  });

  test("falls back to the semester alone when the school year is missing", () => {
    expect(termFullLabel(term({ schoolYear: null }))).toBe("1st sem");
  });
});

describe("termChipLabel", () => {
  test("stays the short semester label", () => {
    expect(termChipLabel(term({}))).toBe("1st sem");
  });
});
