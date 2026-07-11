import { describe, expect, test } from "bun:test";
import {
  JEEPNEY_ROUTES,
  deriveRouteLineFromStops,
  type JeepneyStop,
} from "./jeepney-routes.js";

const stop = (name: string, lat: number, lon: number): JeepneyStop => ({
  name,
  lat,
  lon,
});

describe("deriveRouteLineFromStops", () => {
  test("returns null for fewer than two stops", () => {
    expect(deriveRouteLineFromStops([])).toBeNull();
    expect(deriveRouteLineFromStops([stop("A", 14.1, 121.2)])).toBeNull();
  });

  test("returns a LineString in [lon, lat] order", () => {
    const line = deriveRouteLineFromStops([
      stop("A", 14.1, 121.2),
      stop("B", 14.3, 121.4),
    ]);
    expect(line).not.toBeNull();
    expect(line?.type).toBe("LineString");
    // GeoJSON is lon-first, not lat-first.
    expect(line?.coordinates).toEqual([
      [121.2, 14.1],
      [121.4, 14.3],
    ]);
  });
});

describe("JEEPNEY_ROUTES data", () => {
  test("every route has a real fare and a non-mock description", () => {
    expect(JEEPNEY_ROUTES.length).toBeGreaterThan(0);
    for (const route of JEEPNEY_ROUTES) {
      expect(route.fare.regular).toBeGreaterThan(0);
      expect(route.fare.discounted).toBeGreaterThan(0);
      expect(route.fare.discounted).toBeLessThanOrEqual(route.fare.regular);
      expect(route.description.trim().length).toBeGreaterThan(0);
      expect(route.description).not.toMatch(/mock/i);
      expect(route.stops.length).toBeGreaterThanOrEqual(2);
    }
  });
});
