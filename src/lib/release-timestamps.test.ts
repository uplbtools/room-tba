import { describe, expect, test } from "bun:test";
import { releaseTimestampLabel } from "./release-timestamps.js";

describe("releaseTimestampLabel", () => {
  test("formats a known version in Asia/Manila", () => {
    // 1.0.0 → 2026-04-14T10:15:32Z → 18:15 Manila (+8)
    const label = releaseTimestampLabel("1.0.0");
    expect(label).toContain("2026");
    expect(label).toContain("Apr");
    expect(label).toContain("14");
  });

  test("strips a leading v", () => {
    expect(releaseTimestampLabel("v1.0.0")).toBe(
      releaseTimestampLabel("1.0.0"),
    );
  });

  test("returns null for unknown or invalid versions", () => {
    expect(releaseTimestampLabel("99.99.99")).toBeNull();
    expect(releaseTimestampLabel("")).toBeNull();
  });
});
