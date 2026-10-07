import { describe, expect, test } from "vitest";
import {
  compassHeading,
  describeLocationFix,
  metersToLngLatCircle,
  POOR_GPS_ACCURACY_M,
} from "./geolocation";

describe("describeLocationFix", () => {
  test("good fix under the poor-accuracy threshold says nothing", () => {
    expect(describeLocationFix(20)).toEqual({
      level: "good",
      message: null,
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

describe("compassHeading", () => {
  test("uses the iOS compass heading as is", () => {
    expect(
      compassHeading({ alpha: 10, absolute: false, webkitCompassHeading: 90 }),
    ).toBe(90);
  });

  test("turns an absolute alpha (counter-clockwise) into a compass bearing", () => {
    expect(compassHeading({ alpha: 90, absolute: true })).toBe(270);
    expect(compassHeading({ alpha: 0, absolute: true })).toBe(0);
  });

  test("ignores relative readings that are not anchored to north", () => {
    expect(compassHeading({ alpha: 90, absolute: false })).toBeNull();
    expect(compassHeading({ alpha: null, absolute: true })).toBeNull();
  });

  test("corrects for a rotated screen and wraps past 360", () => {
    expect(
      compassHeading(
        { alpha: 0, absolute: false, webkitCompassHeading: 300 },
        90,
      ),
    ).toBe(30);
  });
});
