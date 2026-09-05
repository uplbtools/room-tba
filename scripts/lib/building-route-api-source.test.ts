import { describe, expect, test } from "bun:test";
import {
  buildingApiUrl,
  parseBuildingRouteApiRows,
} from "./building-route-api-source";

describe("building route API source", () => {
  test("normalizes deployment URLs to the public buildings endpoint", () => {
    expect(buildingApiUrl("https://www.uplb.tools/")).toBe(
      "https://www.uplb.tools/api/buildings",
    );
    expect(buildingApiUrl("https://example.test/api/buildings")).toBe(
      "https://example.test/api/buildings",
    );
  });

  test("parses numeric database strings without changing null coordinates", () => {
    expect(
      parseBuildingRouteApiRows([
        {
          id: "61",
          buildingName: "Example Building",
          lat: "14.161",
          lon: "121.243",
        },
        {
          id: 62,
          buildingName: "No Pin Yet",
          lat: null,
          lon: null,
        },
      ]),
    ).toEqual([
      {
        id: 61,
        buildingName: "Example Building",
        lat: 14.161,
        lon: 121.243,
      },
      {
        id: 62,
        buildingName: "No Pin Yet",
        lat: null,
        lon: null,
      },
    ]);
  });

  test("rejects malformed identity and coordinate rows", () => {
    expect(() => parseBuildingRouteApiRows({})).toThrow(/array/i);
    expect(() => parseBuildingRouteApiRows([{ id: 1, lat: 14, lon: 121 }])).toThrow(
      /buildingName/i,
    );
    expect(() =>
      parseBuildingRouteApiRows([
        { id: 1, buildingName: "Bad", lat: "north", lon: 121 },
      ]),
    ).toThrow(/lat is not finite/i);
  });

  test("rejects finite coordinates outside geographic bounds", () => {
    expect(() =>
      parseBuildingRouteApiRows([
        { id: 1, buildingName: "Bad Latitude", lat: 90.1, lon: 121 },
      ]),
    ).toThrow(/lat is outside -90\.\.90/i);
    expect(() =>
      parseBuildingRouteApiRows([
        { id: 2, buildingName: "Bad Longitude", lat: 14, lon: -180.1 },
      ]),
    ).toThrow(/lon is outside -180\.\.180/i);
  });

  test("fails closed on empty or duplicate-id API payloads", () => {
    expect(() => parseBuildingRouteApiRows([])).toThrow(/returned no rows/i);
    expect(() =>
      parseBuildingRouteApiRows([
        { id: 7, buildingName: "Alpha", lat: 14, lon: 121 },
        { id: "7", buildingName: "Beta", lat: 14.1, lon: 121.1 },
      ]),
    ).toThrow(/duplicate building id 7/i);
  });
});
