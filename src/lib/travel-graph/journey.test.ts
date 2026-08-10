import { describe, expect, test } from "bun:test";
import type { JeepneyRoute } from "@constants/jeepney-routes";
import {
  JEEPNEY_WAIT_SECONDS,
  MAX_ACCESS_WALK_METERS,
} from "@constants/travel-modes";
import { buildTravelGraph, type WalkGraphData } from "./engine";
import {
  describeJourney,
  PLAN_STATUS_NOTES,
  planJourneys,
  routeProgress,
  type RideLeg,
} from "./journey";

/**
 * A straight 4 km corridor of five nodes, 1 km apart, all footway. Long
 * enough that riding beats walking, so the ride branch is reachable without
 * fighting the "not worth the wait" guard.
 *
 *   n0 --1km-- n1 --1km-- n2 --1km-- n3 --1km-- n4
 */
const LAT = 14.16;
const KM_IN_DEGREES = 1000 / 111_320;

function corridor(nodeCount: number): WalkGraphData {
  const nodes: [number, number, number][] = [];
  const edges: WalkGraphData["edges"] = [];
  for (let i = 0; i < nodeCount; i++) {
    nodes.push([i + 1, LAT + i * KM_IN_DEGREES, 121.24]);
    if (i > 0) edges.push([i - 1, i, 1000, "footway", null, []]);
  }
  return {
    meta: { coordScale: 1e6, nodeCount, edgeCount: edges.length },
    nodes,
    edges,
  };
}

const graph = buildTravelGraph(corridor(5));

const nodeAt = (index: number) => ({
  lat: LAT + index * KM_IN_DEGREES,
  lng: 121.24,
});

/** A jeep serving the corridor, stopping at n0, n2 and n4. */
const corridorRoute: JeepneyRoute = {
  id: "corridor",
  name: "Corridor Line",
  description: "test",
  color: "#dc2626",
  fare: { regular: 13, discounted: 11 },
  stops: [0, 2, 4].map((index) => ({
    name: `Stop ${index}`,
    description: "test",
    lat: nodeAt(index).lat,
    lon: 121.24,
  })),
};

describe("planJourneys", () => {
  test("always offers the walk-only option first when it is fastest", () => {
    const { journeys } = planJourneys({
      graph,
      origin: nodeAt(0),
      destination: nodeAt(1),
      routes: [corridorRoute],
    });

    expect(journeys[0].kind).toBe("walk");
    expect(journeys[0].walkMeters).toBeCloseTo(1000, 0);
    // 1 km at 4.5 km/h = 800s.
    expect(journeys[0].seconds).toBeCloseTo(800, 0);
  });

  test("offers a ride when it beats walking, and counts the wait", () => {
    const { journeys } = planJourneys({
      graph,
      origin: nodeAt(0),
      destination: nodeAt(4),
      routes: [corridorRoute],
    });

    const transit = journeys.find((j) => j.kind === "transit");
    expect(transit).toBeDefined();

    const ride = transit?.legs.find(
      (leg): leg is RideLeg => leg.kind === "ride",
    );
    expect(ride?.boardStopName).toBe("Stop 0");
    expect(ride?.alightStopName).toBe("Stop 4");
    expect(ride?.waitSeconds).toBe(JEEPNEY_WAIT_SECONDS);
    // Boarding at the origin and alighting at the destination: no walking.
    expect(transit?.walkMeters).toBeCloseTo(0, 0);
    // 4 km at 14 km/h = ~1029s, plus the 300s wait.
    expect(transit?.seconds).toBeCloseTo(1029 + JEEPNEY_WAIT_SECONDS, -1);
    expect(transit?.seconds).toBeLessThan(journeys[0].seconds + 1);
  });

  test("suppresses a ride that barely beats walking", () => {
    // n0 -> n2 is 2 km: walking 1600s vs riding 514s + 300s wait saves ~13 min,
    // but over a single 1 km hop the wait swallows the saving.
    const { journeys } = planJourneys({
      graph,
      origin: nodeAt(1),
      destination: nodeAt(2),
      routes: [corridorRoute],
    });

    expect(journeys.every((j) => j.kind === "walk")).toBe(true);
  });

  test("ignores stops that are too far to walk to", () => {
    const farRoute: JeepneyRoute = {
      ...corridorRoute,
      stops: corridorRoute.stops.map((stop) => ({
        ...stop,
        // Push the whole line a full degree east, far past the access cap.
        lon: 122.24,
      })),
    };

    const { journeys } = planJourneys({
      graph,
      origin: nodeAt(0),
      destination: nodeAt(4),
      routes: [farRoute],
    });

    expect(journeys.every((j) => j.kind === "walk")).toBe(true);
    expect(MAX_ACCESS_WALK_METERS).toBeLessThan(111_320);
  });

  test("collapses the two directions of one loop into a single option", () => {
    const { journeys } = planJourneys({
      graph,
      origin: nodeAt(0),
      destination: nodeAt(4),
      routes: [corridorRoute],
    });

    const rideRouteIds = journeys
      .flatMap((j) => j.legs)
      .filter((leg): leg is RideLeg => leg.kind === "ride")
      .map((leg) => leg.routeId);

    expect(rideRouteIds).toEqual(["corridor"]);
  });

  test("caps the option list", () => {
    const { journeys } = planJourneys({
      graph,
      origin: nodeAt(0),
      destination: nodeAt(4),
      routes: [
        corridorRoute,
        { ...corridorRoute, id: "b", name: "B" },
        { ...corridorRoute, id: "c", name: "C" },
        { ...corridorRoute, id: "d", name: "D" },
        { ...corridorRoute, id: "e", name: "E" },
      ],
      maxOptions: 3,
    });

    expect(journeys).toHaveLength(3);
  });

  test("reports no route when both ends are mapped but disconnected", () => {
    const isolated = buildTravelGraph({
      meta: { coordScale: 1e6, nodeCount: 2, edgeCount: 0 },
      nodes: [
        [1, 14.16, 121.24],
        [2, 14.2, 121.3],
      ],
      edges: [],
    });

    const plan = planJourneys({
      graph: isolated,
      origin: { lat: 14.16, lng: 121.24 },
      destination: { lat: 14.2, lng: 121.3 },
      routes: [],
    });

    expect(plan.status).toBe("no-route");
    expect(plan.journeys).toEqual([]);
  });

  /**
   * Regression: the walk graph stops at the campus edge, and snapping is
   * unconditional. Without the endpoint guard a town-side origin a kilometre
   * off the network silently borrowed the nearest node and produced a
   * confident, wholly invented walking time.
   */
  test("refuses to plan from a point off the mapped network", () => {
    const plan = planJourneys({
      graph,
      origin: { lat: LAT, lng: 121.3 }, // ~6 km east of the corridor
      destination: nodeAt(4),
      routes: [corridorRoute],
    });

    expect(plan.status).toBe("origin-off-network");
    expect(plan.journeys).toEqual([]);
    expect(PLAN_STATUS_NOTES[plan.status]).toContain("outside the mapped");
  });

  test("refuses to plan to a point off the mapped network", () => {
    const plan = planJourneys({
      graph,
      origin: nodeAt(0),
      destination: { lat: LAT, lng: 121.3 },
      routes: [corridorRoute],
    });

    expect(plan.status).toBe("destination-off-network");
    expect(plan.journeys).toEqual([]);
  });

  test("still plans for a pin dropped just off a path", () => {
    // A GPS fix inside a building is legitimately off-network; only the
    // far-outside case should be refused.
    const plan = planJourneys({
      graph,
      origin: { lat: LAT, lng: 121.2415 }, // ~160 m east of node 0
      destination: nodeAt(2),
      routes: [corridorRoute],
    });

    expect(plan.status).toBe("ok");
    expect(plan.journeys.length).toBeGreaterThan(0);
  });

  test("legs join end to end, so the drawn line has no gaps", () => {
    const { journeys } = planJourneys({
      graph,
      origin: nodeAt(0),
      destination: nodeAt(4),
      routes: [corridorRoute],
    });
    const transit = journeys.find((j) => j.kind === "transit");
    const legs = transit?.legs ?? [];

    for (let i = 1; i < legs.length; i++) {
      const prevEnd = legs[i - 1].coordinates.at(-1);
      const nextStart = legs[i].coordinates[0];
      if (!prevEnd || !nextStart) continue;
      expect(nextStart[0]).toBeCloseTo(prevEnd[0], 3);
      expect(nextStart[1]).toBeCloseTo(prevEnd[1], 3);
    }
  });
});

describe("routeProgress", () => {
  const plan = () =>
    planJourneys({
      graph,
      origin: nodeAt(0),
      destination: nodeAt(4),
      routes: [],
    }).journeys[0];

  test("counts the whole route as remaining at the start", () => {
    const journey = plan();
    const progress = routeProgress(journey, nodeAt(0));

    expect(progress?.fraction).toBeCloseTo(0, 2);
    expect(progress?.remainingMeters).toBeCloseTo(4000, -2);
    expect(progress?.offRouteMeters).toBeLessThan(5);
  });

  test("shrinks the remainder as the rider advances", () => {
    const journey = plan();
    const start = routeProgress(journey, nodeAt(0));
    const middle = routeProgress(journey, nodeAt(2));
    const end = routeProgress(journey, nodeAt(4));

    expect(middle!.remainingMeters).toBeLessThan(start!.remainingMeters);
    expect(end!.remainingMeters).toBeLessThan(middle!.remainingMeters);
    expect(middle?.fraction).toBeCloseTo(0.5, 1);
    expect(end?.remainingMeters).toBeCloseTo(0, 0);
    expect(end?.remainingSeconds).toBeCloseTo(0, 0);
  });

  /**
   * Progress is the closest point on the line, not distance-to-destination.
   * Stepping sideways off the path must not read as having made progress.
   */
  test("reports how far off the line the rider has strayed", () => {
    const journey = plan();
    const strayed = routeProgress(journey, {
      lat: nodeAt(2).lat,
      lng: 121.2427, // ~300 m east of the corridor
    });

    expect(strayed?.offRouteMeters).toBeGreaterThan(200);
    // Still level with node 2, so the remainder is unchanged.
    expect(strayed?.fraction).toBeCloseTo(0.5, 1);
  });

  test("returns null for a journey with no drawable line", () => {
    expect(
      routeProgress(
        {
          id: "x",
          kind: "walk",
          seconds: 1,
          meters: 0,
          walkMeters: 0,
          legs: [],
          fare: null,
          geometrySource: "walk-graph",
        },
        nodeAt(0),
      ),
    ).toBeNull();
  });
});

describe("describeJourney", () => {
  test("names walking plainly", () => {
    expect(
      describeJourney({
        id: "walk",
        kind: "walk",
        seconds: 600,
        meters: 750,
        walkMeters: 750,
        legs: [],
        fare: null,
        geometrySource: "walk-graph",
      }),
    ).toBe("Walking the whole way");
  });

  test("counts hops, not stops, and singularises one", () => {
    const { journeys } = planJourneys({
      graph,
      origin: nodeAt(0),
      destination: nodeAt(4),
      routes: [corridorRoute],
    });
    const transit = journeys.find((j) => j.kind === "transit");

    expect(transit && describeJourney(transit)).toContain(
      "2 stops on Corridor Line",
    );
  });
});
