import { describe, expect, test } from "bun:test";
import { getJeepneyRouteShareUrl } from "./share-links.js";

describe("getJeepneyRouteShareUrl", () => {
  test("builds a jeepney deep link without a stop", () => {
    expect(getJeepneyRouteShareUrl("kaliwa-kanan")).toBe(
      "https://room-tba.uplbtools.me/transit/kaliwa-kanan/",
    );
  });

  test("appends the stop index when given", () => {
    expect(getJeepneyRouteShareUrl("forestry", 3)).toBe(
      "https://room-tba.uplbtools.me/transit/forestry/narra-bridge/",
    );
  });

  test("includes stop=0 (index is not treated as absent)", () => {
    expect(getJeepneyRouteShareUrl("forestry", 0)).toBe(
      "https://room-tba.uplbtools.me/transit/forestry/forestry-jeep-terminal/",
    );
  });

  test("url-encodes the route id", () => {
    expect(getJeepneyRouteShareUrl("a b/c")).toBe(
      "https://room-tba.uplbtools.me/transit/a%20b%2Fc/",
    );
  });
});
