import { describe, expect, test } from "bun:test";
import { getGoogleMapsPinUrl } from "./google-maps-links";

describe("getGoogleMapsPinUrl", () => {
  test("builds a Google Maps query URL from coordinates", () => {
    expect(getGoogleMapsPinUrl(14.6532, 121.0689)).toBe(
      "https://www.google.com/maps?q=14.6532,121.0689",
    );
  });
});
