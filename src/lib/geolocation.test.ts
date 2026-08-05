import { describe, expect, test } from "vitest";
import {
  describeLocationFix,
  metersToLngLatCircle,
  POOR_GPS_ACCURACY_M,
} from "./geolocation";

describe("describeLocationFix", () => {
  test("good fix under the poor-accuracy threshold", () => {
    expect(describeLocationFix(20)).toEqual({
      level: "good",
      message: "Location found!",
    });
    expect(describeLocationFix(POOR_GPS_ACCURACY_M).level).toBe("good");
  });

  test("approximate fix names the uncertainty in meters", () => {
    const result = describeLocationFix(180);
    expect(result.level).toBe("approximate");
    expect(result.message).toContain("±180 m");
  });
});

describe("metersToLngLatCircle", () => {
  test("returns a closed ring around the center", () => {
    const center: [number, number] = [121.24, 14.16];
    const polygon = metersToLngLatCircle(center, 50, 8);
    const ring = polygon.coordinates[0];
    expect(ring.length).toBe(9);
    expect(ring[0]).toEqual(ring.at(-1));
    // Points should sit off the exact center.
    expect(
      ring.some(([lng, lat]) => lng !== center[0] || lat !== center[1]),
    ).toBe(true);
  });
});
