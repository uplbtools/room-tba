import { describe, expect, test } from "bun:test";
import {
  JEEPNEY_ROUTES,
  ROUTE_GEOMETRY_NOTES,
  deriveRouteLineFromStops,
  resolveRouteGeometry,
  type JeepneyStop,
  type StoredRouteGeometry,
  withBundledRoutes,
} from "./jeepney-routes.js";
import jeepneyGeometries from "./jeepney-geometries.json" with { type: "json" };

const stop = (name: string, lat: number, lon: number): JeepneyStop => ({
  name,
  description: `${name} stop.`,
  lat,
  lon,
});

const line = (...coords: [number, number][]): StoredRouteGeometry["geometry"] =>
  ({ type: "LineString", coordinates: coords }) as const;

const stored = jeepneyGeometries as Record<string, StoredRouteGeometry>;

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

describe("resolveRouteGeometry", () => {
  const route = {
    id: "demo",
    stops: [stop("A", 14.1, 121.2), stop("B", 14.3, 121.4)],
  };

  const geometry = line([121.2, 14.1], [121.25, 14.2], [121.4, 14.3]);

  test("prefers stored geometry and reports its source", () => {
    expect(
      resolveRouteGeometry(route, {
        demo: { source: "osm-relation", geometry },
      }),
    ).toEqual({ source: "osm-relation", line: geometry, caveat: null });

    expect(
      resolveRouteGeometry(route, { demo: { source: "routed", geometry } })
        .source,
    ).toBe("routed");
  });

  test("a route-specific caveat overrides the generic one", () => {
    // A sourced line can still be qualified (reversed relation, trimmed
    // corridor, contested alignment); that detail must beat the generic text.
    expect(
      resolveRouteGeometry(route, {
        demo: { source: "osm-relation", caveat: "Drawn backwards.", geometry },
      }).caveat,
    ).toBe("Drawn backwards.");

    expect(
      resolveRouteGeometry(route, { demo: { source: "routed", geometry } })
        .caveat,
    ).toBe(ROUTE_GEOMETRY_NOTES.routed);
  });

  test("falls back to a stops-only line when no geometry is stored", () => {
    const resolved = resolveRouteGeometry(route, {});
    expect(resolved.source).toBe("stops-only");
    expect(resolved.line?.coordinates).toEqual([
      [121.2, 14.1],
      [121.4, 14.3],
    ]);
  });

  test("treats an empty stored line as missing, not as geometry", () => {
    // A truthy-but-empty entry would otherwise draw nothing while claiming to
    // be sourced, hiding the route instead of flagging it.
    const resolved = resolveRouteGeometry(route, {
      demo: { source: "routed", geometry: line() },
    });
    expect(resolved.source).toBe("stops-only");
    expect(resolved.line?.coordinates).toHaveLength(2);
  });

  test("returns no line when a route has too few stops to join", () => {
    expect(
      resolveRouteGeometry({ id: "demo", stops: [stop("A", 14.1, 121.2)] }, {}),
    ).toEqual({
      source: "stops-only",
      line: null,
      caveat: ROUTE_GEOMETRY_NOTES["stops-only"],
    });
  });

  test("only inferred sources carry a rider-facing caveat", () => {
    expect(ROUTE_GEOMETRY_NOTES["osm-relation"]).toBeNull();
    expect(ROUTE_GEOMETRY_NOTES.routed).toContain("road-routed");
    expect(ROUTE_GEOMETRY_NOTES["stops-only"]).toContain("not mapped");
  });
});

describe("jeepney-geometries.json", () => {
  test("every entry declares a source and a drawable line", () => {
    const entries = Object.entries(stored);
    expect(entries.length).toBeGreaterThan(0);
    for (const [id, entry] of entries) {
      expect(["osm-relation", "routed"], id).toContain(entry.source);
      // Provenance is the point of this file; an entry without it is unauditable.
      expect(entry.note, id).toBeTruthy();
      expect(entry.geometry.type, id).toBe("LineString");
      expect(entry.geometry.coordinates.length, id).toBeGreaterThan(1);
      for (const [lon, lat] of entry.geometry.coordinates) {
        // GeoJSON is lon-first; a swapped pair would put UPLB in Somalia.
        expect(lon, id).toBeGreaterThan(100);
        expect(lat, id).toBeLessThan(90);
      }
    }
  });

  test("the bundled campus routes still ship road-snapped geometry", () => {
    for (const route of JEEPNEY_ROUTES) {
      expect(resolveRouteGeometry(route, stored).source, route.id).not.toBe(
        "stops-only",
      );
    }
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
      for (const stop of route.stops) {
        expect(stop.description.trim().length).toBeGreaterThan(0);
      }
    }
  });
});

describe("withBundledRoutes", () => {
  test("adds bundled routes the database does not have, keeping database rows", () => {
    const dbKaliwa = { ...JEEPNEY_ROUTES[0]!, name: "From the database" };
    const merged = withBundledRoutes([dbKaliwa]);
    expect(merged[0]).toBe(dbKaliwa);
    expect(merged.map((r) => r.id)).toContain("snodlob");
  });

  test("replaces a cached route that lost its stops", () => {
    const empty = {
      ...JEEPNEY_ROUTES.find((r) => r.id === "snodlob")!,
      stops: [],
    };
    const merged = withBundledRoutes([empty]);
    expect(merged.find((r) => r.id === "snodlob")?.stops.length).toBe(21);
  });
});
