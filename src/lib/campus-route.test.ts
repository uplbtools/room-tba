import { describe, expect, test } from "bun:test";
import {
  distanceMeters,
  formatDistance,
  formatDuration,
  nearestPlace,
  toCampusRoute,
  type RoutePlace,
} from "./campus-route";
import { describeRoute, generateRouteDescription } from "./route-description";
import {
  findCampusPointBySlug,
  getRoutePath,
  parseRoutePathname,
} from "./route-links";

const baker: RoutePlace = { name: "Baker Hall", lat: 14.165, lon: 121.2419 };
const carabao: RoutePlace = {
  name: "Carabao Park",
  lat: 14.166,
  lon: 121.253,
};

describe("route links", () => {
  test("both endpoints live in the pathname, not a query string", () => {
    // ISR keys on pathname only, so a query string would collapse every pair
    // into one cached page.
    const path = getRoutePath("Baker Hall", "Carabao Park");
    expect(path).toBe("/route/baker-hall/carabao-park/");
    expect(path).not.toContain("?");
  });

  test("round trips", () => {
    expect(parseRoutePathname("/route/baker-hall/carabao-park/")).toEqual({
      fromSlug: "baker-hall",
      toSlug: "carabao-park",
    });
  });

  test("rejects paths that are not routes", () => {
    expect(parseRoutePathname("/route/baker-hall/")).toBeNull();
    expect(parseRoutePathname("/building/baker-hall/")).toBeNull();
    expect(parseRoutePathname("/route/a/b/c/")).toBeNull();
  });
});

describe("findCampusPointBySlug", () => {
  const data = {
    buildings: [{ buildingName: "CEM Building", lat: 14.16, lon: 121.24 }],
    dorms: [{ dormName: "Men's Residence Hall", lat: 14.17, lon: 121.25 }],
    places: [{ name: "Carabao Park", lat: 14.166, lon: 121.253 }],
  };

  test("returns [lon, lat], the order MapLibre wants", () => {
    // The DB columns read lat then lon, so swapping here would silently drop
    // every route into the Pacific.
    expect(findCampusPointBySlug(data, "cem-building")).toEqual([
      121.24, 14.16,
    ]);
  });

  test("resolves across buildings, dorms and places", () => {
    expect(findCampusPointBySlug(data, "men-s-residence-hall")).toEqual([
      121.25, 14.17,
    ]);
    expect(findCampusPointBySlug(data, "carabao-park")).toEqual([
      121.253, 14.166,
    ]);
  });

  test("skips entries with no coordinates instead of returning nulls", () => {
    expect(
      findCampusPointBySlug(
        { places: [{ name: "Unplaced", lat: null, lon: null }] },
        "unplaced",
      ),
    ).toBeNull();
  });

  test("returns null for an unknown slug", () => {
    expect(findCampusPointBySlug(data, "nope")).toBeNull();
  });
});

describe("distance", () => {
  test("measures a known campus separation", () => {
    // ~1.2 km apart in longitude at this latitude.
    const meters = distanceMeters(baker, carabao);
    expect(meters).toBeGreaterThan(1100);
    expect(meters).toBeLessThan(1300);
  });

  test("is zero for the same point", () => {
    expect(distanceMeters(baker, baker)).toBe(0);
  });
});

describe("nearestPlace", () => {
  test("returns nothing when everything is too far to be useful", () => {
    // Naming a landmark 1.2 km away would mislead.
    expect(nearestPlace(baker, [carabao])).toBeNull();
  });

  test("picks the closest candidate inside the radius", () => {
    const near: RoutePlace = { name: "Near", lat: 14.16505, lon: 121.24195 };
    const alsoNear: RoutePlace = { name: "Also", lat: 14.1655, lon: 121.2424 };
    expect(nearestPlace(baker, [alsoNear, near])?.name).toBe("Near");
  });
});

const osrmPayload = {
  code: "Ok",
  routes: [
    {
      distance: 1751.2,
      duration: 1400.4,
      geometry: { coordinates: [[121.2419, 14.165] as [number, number]] },
      legs: [
        {
          steps: [
            {
              distance: 22,
              maneuver: {
                type: "depart",
                location: [121.2419, 14.165] as [number, number],
              },
            },
            {
              distance: 144,
              maneuver: {
                type: "turn",
                modifier: "right",
                location: [121.24195, 14.16505] as [number, number],
              },
            },
            // Under the 25 m floor: path shuffling, not a real instruction.
            {
              distance: 8,
              maneuver: {
                type: "turn",
                modifier: "left",
                location: [121.2419, 14.165] as [number, number],
              },
            },
            {
              distance: 12,
              maneuver: {
                type: "arrive",
                location: [121.253, 14.166] as [number, number],
              },
            },
          ],
        },
      ],
    },
  ],
};

describe("toCampusRoute", () => {
  test("labels turns with our own named places, since OSRM names are empty", () => {
    const route = toCampusRoute(osrmPayload, [baker, carabao]);
    expect(route).not.toBeNull();
    expect(route?.meters).toBe(1751);
    expect(route?.steps).toHaveLength(4);
    expect(route?.steps[1].landmark).toBe("Baker Hall");
    expect(route?.steps[3].landmark).toBe("Carabao Park");
  });

  test("returns null when OSRM reports no route", () => {
    expect(toCampusRoute({ code: "NoRoute", routes: [] }, [])).toBeNull();
  });
});

describe("describeRoute", () => {
  test("states distance and time and drops sub-25m shuffling", () => {
    const route = toCampusRoute(osrmPayload, [baker, carabao]);
    if (!route) throw new Error("expected a route");
    const text = describeRoute(baker, carabao, route);

    expect(text).toContain("1.8 km");
    expect(text).toContain("23 min");
    expect(text).toContain("Start at Baker Hall");
    expect(text).toContain("Arrive at Carabao Park");
    expect(text).toContain("turn right");
    // The 8 m step must not become an instruction.
    expect(text).not.toContain("turn left");
  });
});

describe("generateRouteDescription", () => {
  test("returns null without an API key and never calls out", async () => {
    const route = toCampusRoute(osrmPayload, [baker, carabao]);
    if (!route) throw new Error("expected a route");
    let called = false;
    const spy = (async () => {
      called = true;
      return new Response("{}");
    }) as unknown as typeof fetch;

    expect(
      await generateRouteDescription(baker, carabao, route, undefined, spy),
    ).toBeNull();
    expect(called).toBe(false);
  });

  test("falls back to null when the API errors, so the page still renders", async () => {
    const route = toCampusRoute(osrmPayload, [baker, carabao]);
    if (!route) throw new Error("expected a route");
    const failing = (async () =>
      new Response("nope", { status: 500 })) as unknown as typeof fetch;

    expect(
      await generateRouteDescription(baker, carabao, route, "key", failing),
    ).toBeNull();
  });

  test("returns the model text when the call succeeds", async () => {
    const route = toCampusRoute(osrmPayload, [baker, carabao]);
    if (!route) throw new Error("expected a route");
    const ok = (async () =>
      new Response(
        JSON.stringify({
          content: [{ type: "text", text: "Head out of Baker Hall." }],
        }),
      )) as unknown as typeof fetch;

    expect(
      await generateRouteDescription(baker, carabao, route, "key", ok),
    ).toBe("Head out of Baker Hall.");
  });
});

describe("formatting", () => {
  test("metres below a kilometre, kilometres above", () => {
    expect(formatDistance(340)).toBe("340 m");
    expect(formatDistance(1751)).toBe("1.8 km");
  });

  test("never reports zero minutes", () => {
    expect(formatDuration(20)).toBe("1 min");
    expect(formatDuration(3600)).toBe("1 hr");
    expect(formatDuration(3900)).toBe("1 hr 5 min");
  });
});
