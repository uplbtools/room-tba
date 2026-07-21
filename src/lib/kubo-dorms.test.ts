import { describe, expect, test } from "vitest";
import { getKuboDormUrl } from "./kubo-dorms";

describe("getKuboDormUrl", () => {
  test.each([
    [12, "https://kubo.community/dorms/arable-premier-residences"],
    [15, "https://kubo.community/dorms/scholar-s-dormitory"],
  ])("returns the verified Kubo listing for dorm %i", (id, expected) => {
    expect(getKuboDormUrl(id)).toBe(expected);
  });

  test("returns null for a dorm without a verified Kubo listing", () => {
    expect(getKuboDormUrl(13)).toBeNull();
  });
});
