import { describe, expect, test } from "bun:test";
import {
  distinctStopCount,
  isLoopRoute,
  transitRouteKind,
  transitRouteNoun,
  transitStopNoun,
} from "./transit-route-kind";

describe("transitRouteKind", () => {
  test("bundled routes are campus jeeps", () => {
    expect(transitRouteKind({ id: "forestry", name: "Forestry" })).toBe(
      "campus",
    );
  });

  test("DLTB and provincial buses are buses", () => {
    expect(
      transitRouteKind({ id: "lb-to-buendia", name: "Los Baños → Buendia" }),
    ).toBe("bus");
    expect(
      transitRouteKind({ id: "new-route", name: "X → Y (Commuter Bus)" }),
    ).toBe("bus");
    expect(transitRouteNoun({ id: "uplb-to-upd", name: "UPLB → UPD" })).toBe(
      "bus route",
    );
    expect(transitStopNoun({ id: "uplb-to-upd", name: "UPLB → UPD" })).toBe(
      "Bus stop",
    );
  });

  test("other database routes are town jeeps", () => {
    expect(
      transitRouteKind({
        id: "lb-to-san-pablo",
        name: "Los Baños → San Pablo",
      }),
    ).toBe("town");
    expect(
      transitRouteNoun({
        id: "lb-to-san-pablo",
        name: "Los Baños → San Pablo",
      }),
    ).toBe("jeepney route");
  });
});

describe("isLoopRoute", () => {
  const stop = (name: string, lat: number, lon: number) => ({ name, lat, lon });

  test("a route that ends where it starts is a loop", () => {
    const route = {
      stops: [
        stop("Olivarez Plaza Mall", 14.17903, 121.23908),
        stop("Robinsons", 14.1773, 121.2424),
        stop("Raymundo Gate", 14.1677, 121.2416),
        stop("Olivarez Plaza Mall", 14.17903, 121.23908),
      ],
    };
    expect(isLoopRoute(route)).toBe(true);
    expect(distinctStopCount(route)).toBe(3);
  });

  test("a one-way route is not", () => {
    const route = {
      stops: [
        stop("A", 14.1, 121.1),
        stop("B", 14.2, 121.2),
        stop("C", 14.3, 121.3),
      ],
    };
    expect(isLoopRoute(route)).toBe(false);
    expect(distinctStopCount(route)).toBe(3);
  });
});
