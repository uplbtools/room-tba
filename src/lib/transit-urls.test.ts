import { describe, expect, it } from "bun:test";
import { JEEPNEY_ROUTES } from "@constants/jeepney-routes";
import {
  getTransitStopIndex,
  getTransitStopPath,
  parseTransitPathname,
} from "./transit-urls";

describe("transit URLs", () => {
  it("uses the campus shorthand for Carabao Park / DevCom", () => {
    expect(getTransitStopPath("kaliwa-kanan", 2)).toBe(
      "/transit/kaliwa-kanan/cpark-devcom/",
    );
  });

  it("round-trips a stop path", () => {
    const route = JEEPNEY_ROUTES.find((entry) => entry.id === "kaliwa-kanan")!;
    const parsed = parseTransitPathname("/transit/kaliwa-kanan/cpark-devcom/")!;
    expect(parsed).toEqual({
      routeId: "kaliwa-kanan",
      stopSlug: "cpark-devcom",
    });
    expect(getTransitStopIndex(route, parsed.stopSlug!)).toBe(2);
  });
});
