import { describe, expect, test } from "bun:test";
import type { JeepneyRoute } from "@constants/jeepney-routes";
import { buildTravelGraph, type WalkGraphData } from "./engine";
import { planJourneys, routeProgress } from "./journey";
import { currentStepIndex, journeySteps } from "./journey-steps";

/** A 4 km footway corridor, a node every 500 m (n0 … n8). */
const LAT = 14.16;
const STEP = 500 / 111_320;
const indexes = [0, 1, 2, 3, 4, 5, 6, 7, 8];
const data: WalkGraphData = {
  meta: { coordScale: 1e6, nodeCount: 9, edgeCount: 8 },
  nodes: indexes.map((i) => [i + 1, LAT + i * STEP, 121.24]),
  edges: indexes.slice(1).map((i) => [i - 1, i, 500, "footway", null, []]),
};
const graph = buildTravelGraph(data);
const at = (i: number) => ({ lat: LAT + i * STEP, lng: 121.24 });

const route: JeepneyRoute = {
  id: "corridor",
  name: "Forestry",
  description: "test",
  color: "#16a34a",
  fare: { regular: 14, discounted: 12 },
  stops: [
    { name: "Gate", description: "", lat: at(0).lat, lon: 121.24 },
    {
      name: "UP Health Service",
      description: "",
      lat: at(4).lat,
      lon: 121.24,
    },
    { name: "Forestry Hall", description: "", lat: at(8).lat, lon: 121.24 },
  ],
};

const destination = { ...at(8), label: "Forestry Residence Hall" };

function transitJourney() {
  const { journeys } = planJourneys({
    graph,
    origin: at(3),
    destination: at(8),
    routes: [route],
  });
  return journeys.find((j) => j.kind === "transit")!;
}

describe("journeySteps", () => {
  test("reads walk, board, get off; drops a zero-length final walk", () => {
    const steps = journeySteps(transitJourney(), [destination]);
    expect(steps.map((s) => s.text)).toEqual([
      "Walk to UP Health Service stop",
      "Board the Forestry jeep",
      "Get off at Forestry Hall",
    ]);
    expect(steps[1]!.detail).toContain("At UP Health Service");
    expect(steps[2]!.detail).toContain("1 stop");
  });

  test("a walk-only journey walks to the destination by name", () => {
    const { journeys } = planJourneys({
      graph,
      origin: at(0),
      destination: at(2),
      routes: [],
    });
    const steps = journeySteps(journeys[0]!, [
      { ...at(2), label: "Main Library" },
    ]);
    expect(steps).toHaveLength(1);
    expect(steps[0]!.text).toBe("Walk to Main Library");
    expect(steps[0]!.detail).toBe("13 min · 1.0 km");
  });
});

describe("currentStepIndex", () => {
  test("follows the rider from walking to boarding to riding", () => {
    const journey = transitJourney();
    const steps = journeySteps(journey, [destination]);
    const stepAt = (point: { lat: number; lng: number }) =>
      currentStepIndex(steps, routeProgress(journey, point));

    expect(currentStepIndex(steps, null)).toBe(0);
    expect(stepAt({ lat: at(3).lat + 0.4 * STEP, lng: 121.24 })).toBe(0);
    // At the stop: board.
    expect(stepAt(at(4))).toBe(1);
    // Halfway along the ride: next is getting off.
    expect(stepAt(at(6))).toBe(2);
  });
});

describe("routeProgress totals", () => {
  test("starts on exactly the distance and time the card quoted", () => {
    const journey = transitJourney();
    const progress = routeProgress(journey, at(3))!;
    expect(progress.remainingMeters).toBeCloseTo(journey.meters, 6);
    expect(progress.remainingSeconds).toBeCloseTo(journey.seconds, 6);
    expect(progress.legIndex).toBe(0);
  });
});
