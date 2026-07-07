import { describe, expect, it } from "bun:test";
import { parsePlanner, serializePlanner } from "./persist.js";
import type { PlannerPlan } from "./types.js";

const plan: PlannerPlan = {
  id: "p1",
  label: "A",
  termId: 1252,
  sections: [
    {
      courseCode: "CMSC 128",
      section: "AB-1L",
      type: "LEC",
      schedule: ["MW 07:00AM-08:00AM"],
      roomCode: "ICS MH1",
      courseTitle: "Software Engineering",
    },
  ],
};

describe("planner persistence", () => {
  it("round-trips v1 state", () => {
    const raw = serializePlanner({
      plans: [plan],
      activePlanIdByTerm: { "1252": "p1" },
    });
    expect(parsePlanner(raw)).toEqual({
      v: 1,
      plans: [plan],
      activePlanIdByTerm: { "1252": "p1" },
    });
  });

  it("returns empty state for null, garbage, and unknown versions", () => {
    const empty = { v: 1, plans: [], activePlanIdByTerm: {} };
    expect(parsePlanner(null)).toEqual(empty);
    expect(parsePlanner("not json")).toEqual(empty);
    expect(parsePlanner(JSON.stringify({ v: 2, plans: [] }))).toEqual(empty);
    expect(parsePlanner(JSON.stringify([1, 2]))).toEqual(empty);
  });

  it("drops malformed plans and sections without failing", () => {
    const raw = JSON.stringify({
      v: 1,
      plans: [
        plan,
        { id: 5, label: "B" },
        { ...plan, id: "p2", sections: [{ courseCode: 42 }] },
      ],
      activePlanIdByTerm: { "1252": "p1", "1253": "missing-plan" },
    });
    const parsed = parsePlanner(raw);
    expect(parsed.plans.map((p) => p.id)).toEqual(["p1", "p2"]);
    expect(parsed.plans[1].sections).toEqual([]);
    expect(parsed.activePlanIdByTerm).toEqual({ "1252": "p1" });
  });
});
