import { describe, it, expect } from "bun:test";
import { absoluteUrl, ogCardPath, ogImageUrl } from "@lib/site";

describe("OG meta helpers", () => {
  it("ogImageUrl returns absolute image URL", () => {
    const url = ogImageUrl();
    expect(url).toContain("/socmed.png");
    expect(url.startsWith("http")).toBe(true);
  });

  it("absoluteUrl joins site URL with path", () => {
    expect(absoluteUrl("/room/ics-1/")).toContain("/room/ics-1/");
  });

  it("ogCardPath encodes title, subtitle, and kicker", () => {
    const path = ogCardPath({
      title: "Physical Sciences Building",
      subtitle: "34 rooms · 120 classes",
      kicker: "Building at UPLB",
    });
    const params = new URL(path, "https://example.test").searchParams;
    expect(path.startsWith("/og.png?")).toBe(true);
    expect(params.get("t")).toBe("Physical Sciences Building");
    expect(params.get("s")).toBe("34 rooms · 120 classes");
    expect(params.get("k")).toBe("Building at UPLB");
  });

  it("ogCardPath omits empty subtitle and kicker", () => {
    const params = new URL(
      ogCardPath({ title: "PhySci" }),
      "https://example.test",
    ).searchParams;
    expect(params.get("t")).toBe("PhySci");
    expect(params.has("s")).toBe(false);
    expect(params.has("k")).toBe(false);
  });
});
