import { describe, expect, test } from "bun:test";
import {
  buildingRouteSourceSha256,
  sha256Text,
} from "./building-route-audit-provenance";

describe("building route audit provenance", () => {
  test("computes standard SHA-256 text fingerprints", () => {
    expect(sha256Text("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  test("building source fingerprint is stable across row order and edge whitespace", () => {
    const a = buildingRouteSourceSha256([
      { id: 2, buildingName: "Beta", lat: 14.2, lon: 121.2 },
      { id: 1, buildingName: "Alpha\t", lat: 14.1, lon: 121.1 },
    ]);
    const b = buildingRouteSourceSha256([
      { id: 1, buildingName: " Alpha ", lat: 14.1, lon: 121.1 },
      { id: 2, buildingName: "Beta", lat: 14.2, lon: 121.2 },
    ]);

    expect(a).toBe(b);
  });

  test("route-relevant coordinate changes invalidate the building fingerprint", () => {
    const before = buildingRouteSourceSha256([
      { id: 1, buildingName: "Alpha", lat: 14.1, lon: 121.1 },
    ]);
    const after = buildingRouteSourceSha256([
      { id: 1, buildingName: "Alpha", lat: 14.1001, lon: 121.1 },
    ]);

    expect(after).not.toBe(before);
  });
});
