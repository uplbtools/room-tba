import { describe, expect, test } from "bun:test";
import {
  OLIVAREZ_NAME,
  planTransitFixes,
  type RouteRow,
  type StopRow,
} from "./transit-fixes-core";

const stop = (over: Partial<StopRow>): StopRow => ({
  id: 1,
  routeId: "lb-to-san-pablo",
  name: "Bay (Poblacion)",
  description: "Stop in Bay.",
  lat: 14.1831,
  lon: 121.2868,
  version: 1,
  ...over,
});

const route = (over: Partial<RouteRow>): RouteRow => ({
  id: "lb-to-san-pablo",
  name: "Los Baños → San Pablo",
  description:
    "Jeepney toward San Pablo City, via Bay and Alaminos to San Pablo.",
  fareRegular: 50,
  fareDiscounted: 40,
  version: 3,
  ...over,
});

const campus = new Set(["kaliwa-kanan", "forestry", "up-rural"]);

describe("planTransitFixes", () => {
  test("replaces Alaminos with Calauan on the San Pablo route", () => {
    const fixes = planTransitFixes(
      [route({})],
      [stop({ id: 7, name: "Alaminos", lat: 14.0638, lon: 121.2456 })],
      campus,
    );
    const stopFix = fixes.find((f) => f.table === "jeepney_stops");
    expect(stopFix?.after).toMatchObject({
      name: "Calauan (Poblacion)",
      lat: 14.14537,
      lon: 121.3147,
    });
    expect(stopFix?.before).toMatchObject({ name: "Alaminos", lat: 14.0638 });
    const routeFix = fixes.find((f) => f.table === "jeepney_routes");
    expect(routeFix?.after.description).toContain("via Bay and Calauan");
  });

  test("gives Olivarez Plaza one name off campus, keeping the aliases", () => {
    const fixes = planTransitFixes(
      [],
      [
        stop({ id: 2, routeId: "buendia-to-lb", name: "Los Baños Crossing" }),
        stop({ id: 3, routeId: "kaliwa-kanan", name: "Olivarez Plaza Mall" }),
        stop({
          id: 4,
          routeId: "lb-to-calamba",
          name: "Olivarez Plaza / College (Los Baños)",
        }),
      ],
      campus,
    );
    expect(fixes.map((f) => f.id)).toEqual([2, 4]);
    expect(fixes.every((f) => f.after.name === OLIVAREZ_NAME)).toBe(true);
    expect(fixes[0]?.after).toMatchObject({
      description: expect.stringContaining("Los Baños Crossing"),
    });
  });

  test("evens out the paired Buendia bus names", () => {
    const fixes = planTransitFixes(
      [route({ id: "buendia-to-lb", name: "Buendia → Los Baños" })],
      [],
      campus,
    );
    expect(fixes[0]?.after).toEqual({
      name: "Buendia (LRT Gil Puyat) → Los Baños",
    });
  });

  test("sets the October 2026 campus and Calamba fares", () => {
    const fixes = planTransitFixes(
      [
        route({ id: "kaliwa-kanan", fareRegular: 13, fareDiscounted: 11 }),
        route({
          id: "lb-to-calamba",
          description:
            "Serves SM Calamba via Pansol. ~₱20 jeepney fare per commuter sources; verify against the current LTFRB matrix.",
          fareRegular: 20,
          fareDiscounted: 16,
        }),
        // DLTB is ticketed online; its stored fare is left alone.
        route({ id: "uplb-to-upd", fareRegular: 165, fareDiscounted: 132 }),
      ],
      [],
      campus,
    );
    expect(fixes.map((f) => f.id)).toEqual(["kaliwa-kanan", "lb-to-calamba"]);
    expect(fixes[0]?.after).toEqual({ fareRegular: 14, fareDiscounted: 12 });
    expect(fixes[1]?.after).toEqual({
      fareRegular: 30,
      fareDiscounted: 25,
      description: "Serves SM Calamba via Pansol.",
    });
  });

  test("plans nothing once applied", () => {
    const fixes = planTransitFixes(
      [
        route({ description: "via Bay and Calauan to San Pablo." }),
        route({
          id: "buendia-to-lb",
          name: "Buendia (LRT Gil Puyat) → Los Baños",
        }),
      ],
      [
        stop({
          id: 7,
          name: "Calauan (Poblacion)",
          description:
            "Stop on the national highway through Calauan town proper.",
          lat: 14.14537,
          lon: 121.3147,
        }),
        stop({ id: 2, routeId: "buendia-to-lb", name: OLIVAREZ_NAME }),
      ],
      campus,
    );
    expect(fixes).toEqual([]);
  });
});
