import { describe, expect, test } from "bun:test";
import { getJeepneyRouteShareUrl } from "./share-links.js";

describe("getJeepneyRouteShareUrl", () => {
  test("builds a jeepney deep link without a stop", () => {
    expect(getJeepneyRouteShareUrl("kaliwa-kanan")).toBe(
      "https://room-tba.uplbtools.me/?jeepney=kaliwa-kanan",
    );
  });

  test("appends the stop index when given", () => {
    expect(getJeepneyRouteShareUrl("forestry", 3)).toBe(
      "https://room-tba.uplbtools.me/?jeepney=forestry&stop=3",
    );
  });

  test("includes stop=0 (index is not treated as absent)", () => {
    expect(getJeepneyRouteShareUrl("forestry", 0)).toBe(
      "https://room-tba.uplbtools.me/?jeepney=forestry&stop=0",
    );
  });

  test("url-encodes the route id", () => {
    expect(getJeepneyRouteShareUrl("a b/c")).toBe(
      "https://room-tba.uplbtools.me/?jeepney=a%20b%2Fc",
    );
  });
});
