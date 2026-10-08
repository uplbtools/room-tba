import { describe, expect, test } from "bun:test";
import {
  JEEPNEY_ROUTES,
  resolveRouteGeometry,
  type StoredRouteGeometry,
} from "@constants/jeepney-routes";
import jeepneyGeometries from "@constants/jeepney-geometries.json" with {
  type: "json",
};
import { distanceMeters } from "../campus-route";
import { polylineMeters, sliceRouteLine } from "./ride-geometry";

/** An L-shaped street: east 0.002°, then north 0.002°. */
const street: [number, number][] = [
  [121.24, 14.16],
  [121.241, 14.16],
  [121.242, 14.16],
  [121.242, 14.161],
  [121.242, 14.162],
];

describe("sliceRouteLine", () => {
  test("follows the street round the corner between two stops", () => {
    const slice = sliceRouteLine(
      street,
      { lat: 14.16, lon: 121.2405 },
      { lat: 14.1615, lon: 121.242 },
    );
    expect(slice).not.toBeNull();
    // Keeps the corner vertex a straight chord would cut.
    expect(slice).toContainEqual([121.242, 14.16]);
    expect(slice![0]).toEqual([121.2405, 14.16]);
    expect(slice!.at(-1)![1]).toBeCloseTo(14.1615, 6);
  });

  test("returns null when a stop is far off the line", () => {
    expect(
      sliceRouteLine(
        street,
        { lat: 14.16, lon: 121.2405 },
        { lat: 14.17, lon: 121.25 },
      ),
    ).toBeNull();
  });

  test("wraps across the seam of a closed loop", () => {
    const loop: [number, number][] = [
      [121.24, 14.16],
      [121.242, 14.16],
      [121.242, 14.162],
      [121.24, 14.162],
      [121.24, 14.16],
    ];
    // Board on the last side (west, heading south), alight on the first.
    const slice = sliceRouteLine(
      loop,
      { lat: 14.161, lon: 121.24 },
      { lat: 14.16, lon: 121.241 },
    );
    expect(slice).not.toBeNull();
    expect(slice).toContainEqual([121.24, 14.16]);
    expect(polylineMeters(slice!)).toBeLessThan(300);
  });
});

describe("real route geometry", () => {
  const stored = jeepneyGeometries as Record<string, StoredRouteGeometry>;

  test("a Forestry ride follows the road, not the stop chord", () => {
    const forestry = JEEPNEY_ROUTES.find((route) => route.id === "forestry")!;
    const { line, source } = resolveRouteGeometry(forestry, stored);
    expect(source).not.toBe("stops-only");
    const board = forestry.stops.findIndex((s) =>
      /Health Service/.test(s.name),
    );
    const alight = forestry.stops.findIndex((s) => /Botanic/.test(s.name));
    const coords = line!.coordinates as [number, number][];
    const slice = sliceRouteLine(
      coords,
      forestry.stops[board]!,
      forestry.stops[alight]!,
    );
    expect(slice).not.toBeNull();
    expect(slice!.length).toBeGreaterThan(alight - board + 1);
    let chord = 0;
    for (let i = board; i < alight; i++) {
      chord += distanceMeters(forestry.stops[i]!, forestry.stops[i + 1]!);
    }
    const road = polylineMeters(slice!);
    expect(road).toBeGreaterThanOrEqual(chord * 0.9);
    expect(road).toBeLessThan(chord * 2);
  });
});
