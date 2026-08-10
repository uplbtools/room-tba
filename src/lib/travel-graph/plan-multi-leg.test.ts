import { describe, expect, test } from "bun:test";
import type { JeepneyRoute } from "@constants/jeepney-routes";
import { buildTravelGraph, type WalkGraphData } from "./engine";
import { planJourneys } from "./journey";
import { journeyOptionLabel, planMultiLegJourneys } from "./plan-multi-leg";

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

describe("planMultiLegJourneys", () => {
  test("two points delegates to planJourneys (walk first)", () => {
    const multi = planMultiLegJourneys({
      graph,
      points: [nodeAt(0), nodeAt(1)],
      routes: [corridorRoute],
    });
    const single = planJourneys({
      graph,
      origin: nodeAt(0),
      destination: nodeAt(1),
      routes: [corridorRoute],
    });
    expect(multi.journeys[0].kind).toBe("walk");
    expect(multi.journeys[0].seconds).toBe(single.journeys[0].seconds);
  });

  test("stitches a walk option through a waypoint", () => {
    const { journeys, status } = planMultiLegJourneys({
      graph,
      points: [nodeAt(0), nodeAt(2), nodeAt(4)],
      routes: [corridorRoute],
    });
    expect(status).toBe("ok");
    const walk = journeys.find((j) => j.kind === "walk");
    expect(walk).toBeDefined();
    expect(walk?.meters).toBeCloseTo(4000, 0);
    expect(journeyOptionLabel(walk!)).toBe("Walk");
  });

  test("offers a commute option when a jeep serves the hops", () => {
    const { journeys } = planMultiLegJourneys({
      graph,
      points: [nodeAt(0), nodeAt(4)],
      routes: [corridorRoute],
    });
    const commute = journeys.find((j) => j.kind === "transit");
    expect(commute).toBeDefined();
    expect(journeyOptionLabel(commute!)).toContain("Commute");
    expect(journeyOptionLabel(commute!)).toContain("Corridor Line");
  });
});

describe("journeyOptionLabel", () => {
  test("labels walk and named commute", () => {
    const { journeys } = planJourneys({
      graph,
      origin: nodeAt(0),
      destination: nodeAt(4),
      routes: [corridorRoute],
    });
    const walk = journeys.find((j) => j.kind === "walk");
    const transit = journeys.find((j) => j.kind === "transit");
    expect(walk).toBeDefined();
    expect(transit).toBeDefined();
    expect(journeyOptionLabel(walk!)).toBe("Walk");
    expect(journeyOptionLabel(transit!)).toBe("Commute · Corridor Line");
  });
});
