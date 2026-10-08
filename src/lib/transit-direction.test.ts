import { describe, expect, test } from "bun:test";
import { BUNDLED_BUS_ROUTES, JEEPNEY_ROUTES } from "@constants/jeepney-routes";
import {
  activeDirection,
  orientRoute,
  reverseLine,
  routesAtStop,
} from "./transit-direction";

const kaliwaKanan = JEEPNEY_ROUTES.find((r) => r.id === "kaliwa-kanan")!;
const forestry = JEEPNEY_ROUTES.find((r) => r.id === "forestry")!;
const allRoutes = [...JEEPNEY_ROUTES, ...BUNDLED_BUS_ROUTES];

describe("orientRoute", () => {
  test("Kaliwa serves the Kanan stops in reverse", () => {
    const kaliwa = orientRoute(kaliwaKanan, true);
    expect(kaliwa.id).toBe("kaliwa-kanan");
    expect(kaliwa.stops[1]!.name).toBe("Carabao Park / Landbank");
    expect(kaliwa.stops.at(-2)!.name).toBe("Robinsons Town Mall");
    expect(kaliwaKanan.stops[1]!.name).toBe("Robinsons Town Mall");
  });

  test("one-way routes keep their only real order", () => {
    expect(orientRoute(forestry, true)).toBe(forestry);
  });

  test("labels the shown direction", () => {
    expect(activeDirection("kaliwa-kanan", false)?.label).toBe("Kanan");
    expect(activeDirection("kaliwa-kanan", true)?.label).toBe("Kaliwa");
    expect(activeDirection("forestry", true)).toBeNull();
  });
});

describe("reverseLine", () => {
  test("flips the drawn line so the arrows follow the direction", () => {
    expect(
      reverseLine({
        type: "LineString",
        coordinates: [
          [1, 2],
          [3, 4],
        ],
      })?.coordinates,
    ).toEqual([
      [3, 4],
      [1, 2],
    ]);
    expect(reverseLine(null)).toBeNull();
  });
});

describe("routesAtStop", () => {
  test("finds every route serving a stop by position, not name", () => {
    const library = kaliwaKanan.stops.find((s) => s.name === "Main Library")!;
    const serving = routesAtStop(allRoutes, library);
    const ids = serving.map((entry) => entry.route.id);
    expect(ids).toContain("kaliwa-kanan");
    expect(ids).toContain("snodlob");
    expect(serving.find((e) => e.route.id === "kaliwa-kanan")!.direction).toBe(
      "Kanan / Kaliwa",
    );
    expect(serving.find((e) => e.route.id === "snodlob")!.direction).toBe(
      "One-way loop",
    );
  });

  test("a loop terminal resolves to stop 1, not the closing stop", () => {
    const olivarez = kaliwaKanan.stops[0]!;
    const entry = routesAtStop([kaliwaKanan], olivarez)[0]!;
    expect(entry.stopIndex).toBe(0);
  });

  test("one-way routes say where they are heading", () => {
    const gate = BUNDLED_BUS_ROUTES[0]!.stops[0]!;
    const serving = routesAtStop(BUNDLED_BUS_ROUTES, gate);
    expect(
      serving.find((e) => e.route.id === "uplb-to-buendia")!.direction,
    ).toBe("Toward Buendia bus terminal (LRT-1 Gil Puyat)");
    expect(
      serving.find((e) => e.route.id === "buendia-to-uplb")!.direction,
    ).toBe("Last stop");
  });
});
