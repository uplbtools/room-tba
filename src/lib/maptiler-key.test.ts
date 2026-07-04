import { describe, expect, test } from "bun:test";
import {
  applyMaptilerKeyToText,
  MAPTILER_KEY_PLACEHOLDER,
} from "@lib/maptiler-key";

describe("maptiler-key", () => {
  test("replaces placeholder in tile URLs", () => {
    const url = `https://api.maptiler.com/tiles/v3-openmaptiles/tiles.json?key=${MAPTILER_KEY_PLACEHOLDER}`;
    expect(applyMaptilerKeyToText(url, "test-key")).toBe(
      "https://api.maptiler.com/tiles/v3-openmaptiles/tiles.json?key=test-key",
    );
  });

  test("replaces every placeholder in serialized style JSON", () => {
    const json = JSON.stringify({
      sources: {
        openmaptiles: {
          url: `https://api.maptiler.com/example?key=${MAPTILER_KEY_PLACEHOLDER}`,
        },
      },
    });
    const out = applyMaptilerKeyToText(json, "abc123");
    expect(out).not.toContain(MAPTILER_KEY_PLACEHOLDER);
    expect(out).toContain("abc123");
  });
});
