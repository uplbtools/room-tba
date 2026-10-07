import { describe, expect, test } from "bun:test";
import {
  distinctStopCount,
  isLoopRoute,
  perBoardingFare,
  routeFareInfo,
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

describe("routeFareInfo", () => {
  test("campus jeeps quote the verified flat fare", () => {
    const info = routeFareInfo({ id: "kaliwa-kanan", name: "Kaliwa / Kanan" });
    expect(info).toMatchObject({
      kind: "fixed",
      fare: { regular: 14, discounted: 12 },
    });
    expect(perBoardingFare({ id: "forestry", name: "Forestry" })).toEqual({
      regular: 14,
      discounted: 12,
    });
  });

  test("Calamba quotes the whole-route fare and the minimum for shorter rides", () => {
    const info = routeFareInfo({
      id: "lb-to-calamba",
      name: "Los Baños → Calamba",
    });
    expect(info.kind).toBe("end-to-end");
    if (info.kind !== "end-to-end") return;
    expect(info.fare).toEqual({ regular: 30, discounted: 25 });
    expect(info.note).toContain("all the way to Calamba");
    expect(info.note).toContain("₱14 minimum");
    expect(info.note).toContain("October 7, 2026");
    expect(
      perBoardingFare({ id: "lb-to-calamba", name: "Los Baños → Calamba" }),
    ).toBeNull();
  });

  test("the SNODLOB e-jeep quotes no unverified fare", () => {
    const info = routeFareInfo({
      id: "snodlob",
      name: "UPLB Loop (SNODLOB e-jeep)",
    });
    expect(info.kind).toBe("unverified");
    expect(
      perBoardingFare({ id: "snodlob", name: "UPLB Loop (SNODLOB e-jeep)" }),
    ).toBeNull();
  });

  test("other town jeeps give only the minimum", () => {
    const info = routeFareInfo({
      id: "lb-to-san-pablo",
      name: "Los Baños → San Pablo",
    });
    expect(info).toMatchObject({
      kind: "distance",
      minimum: { regular: 14, discounted: 12 },
    });
  });

  test("DLTB links to tickets; unverified buses quote nothing", () => {
    expect(
      routeFareInfo({ id: "uplb-to-upd", name: "UPLB → UP Diliman" }).kind,
    ).toBe("ticketed");
    expect(
      routeFareInfo({ id: "lb-to-buendia", name: "Los Baños → Buendia" }).kind,
    ).toBe("unverified");
  });
});
