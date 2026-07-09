import { describe, expect, it } from "bun:test";
import { sectionNaturalKey } from "./types.js";

describe("sectionNaturalKey", () => {
  it("joins course code, section, and type with the :: separator", () => {
    expect(
      sectionNaturalKey({
        courseCode: "CMSC 128",
        section: "AB-1L",
        type: "LAB",
      }),
    ).toBe("CMSC 128::AB-1L::LAB");
  });

  it("distinguishes LEC from LAB of the same section (dedup relies on this)", () => {
    const base = { courseCode: "CMSC 128", section: "AB-1L" };
    expect(sectionNaturalKey({ ...base, type: "LEC" })).not.toBe(
      sectionNaturalKey({ ...base, type: "LAB" }),
    );
  });
});
