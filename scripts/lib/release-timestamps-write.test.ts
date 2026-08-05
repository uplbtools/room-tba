import { describe, expect, it } from "bun:test";
import { canWriteReleaseTimestamps } from "./release-timestamps-write.ts";

describe("canWriteReleaseTimestamps", () => {
  it("refuses on a developer machine, which is what caused #925", () => {
    expect(canWriteReleaseTimestamps({})).toBe(false);
    expect(canWriteReleaseTimestamps({ CI: "" })).toBe(false);
    expect(canWriteReleaseTimestamps({ CI: "false" })).toBe(false);
  });

  it("allows CI so production still ships exact timestamps", () => {
    // GitHub Actions
    expect(canWriteReleaseTimestamps({ CI: "true" })).toBe(true);
    // Vercel
    expect(canWriteReleaseTimestamps({ CI: "1" })).toBe(true);
  });

  it("allows a deliberate local refresh of the committed fallback", () => {
    expect(canWriteReleaseTimestamps({ RELEASE_TIMESTAMPS_WRITE: "1" })).toBe(
      true,
    );
  });
});
