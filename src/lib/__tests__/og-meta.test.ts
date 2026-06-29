import { describe, it, expect } from "bun:test";
import { ogImageUrl, absoluteUrl } from "@lib/site";

describe("OG meta helpers", () => {
  it("ogImageUrl returns absolute image URL", () => {
    const url = ogImageUrl();
    expect(url).toContain("/socmed.png");
    expect(url.startsWith("http")).toBe(true);
  });

  it("absoluteUrl joins site URL with path", () => {
    expect(absoluteUrl("/room/ics-1/")).toContain("/room/ics-1/");
  });
});
