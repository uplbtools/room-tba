import { describe, expect, test } from "bun:test";
import { parseIdRouteSlug } from "./route-slugs";

describe("parseIdRouteSlug", () => {
  test("parses numeric suffix from room route slugs", () => {
    expect(parseIdRouteSlug("pslh-a-42")).toBe(42);
    expect(parseIdRouteSlug("melchor-hall-1001")).toBe(1001);
  });

  test("returns null for invalid slugs", () => {
    expect(parseIdRouteSlug("no-id-here")).toBeNull();
    expect(parseIdRouteSlug("bad-0")).toBeNull();
    expect(parseIdRouteSlug("")).toBeNull();
  });
});
