import { describe, expect, it } from "bun:test";
import {
  mergePlannerState,
  parsePlanner,
  serializePlanner,
} from "./persist.js";
import type { PlannerPlan } from "./types.js";

const makePlan = (id: string, termId = 1252): PlannerPlan => ({
  id,
  label: id,
  termId,
  sections: [],
});

describe("mergePlannerState", () => {
  it("unions local-only and remote-only plans", () => {
    const merged = mergePlannerState(
      { plans: [makePlan("local")], activePlanIdByTerm: {} },
      { plans: [makePlan("remote")], activePlanIdByTerm: {} },
    );
    expect(merged.plans.map((p) => p.id).sort()).toEqual(["local", "remote"]);
  });

  it("remote wins on a shared plan id", () => {
    const merged = mergePlannerState(
      {
        plans: [{ ...makePlan("p1"), label: "local" }],
        activePlanIdByTerm: {},
      },
      {
        plans: [{ ...makePlan("p1"), label: "remote" }],
        activePlanIdByTerm: {},
      },
    );
    expect(merged.plans).toHaveLength(1);
    expect(merged.plans[0]?.label).toBe("remote");
  });

  it("keeps active-plan choices only for plans that survive the merge", () => {
    const merged = mergePlannerState(
      { plans: [makePlan("local")], activePlanIdByTerm: { "1252": "local" } },
      {
        plans: [makePlan("remote")],
        activePlanIdByTerm: { "1253": "gone" },
      },
    );
    expect(merged.activePlanIdByTerm).toEqual({ "1252": "local" });
  });
});

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

describe("section notes", () => {
  const planWithNote: PlannerPlan = {
    id: "p1",
    label: "A",
    termId: 1252,
    sections: [
      {
        courseCode: "CRS 100",
        section: "A1",
        type: "LEC",
        schedule: ["MW 07:00AM-08:00AM"],
        roomCode: null,
        courseTitle: null,
        note: "Dr. Santos",
      },
    ],
  };

  it("round-trips notes for account persistence", () => {
    const raw = serializePlanner({
      plans: [planWithNote],
      activePlanIdByTerm: {},
    });
    expect(parsePlanner(raw).plans[0]?.sections[0]?.note).toBe("Dr. Santos");
  });

  it("keeps the account note when it wins a shared plan merge", () => {
    const merged = mergePlannerState(
      {
        plans: [
          {
            ...planWithNote,
            sections: planWithNote.sections.map(({ note: _note, ...s }) => s),
          },
        ],
        activePlanIdByTerm: {},
      },
      {
        plans: [planWithNote],
        activePlanIdByTerm: {},
      },
    );
    expect(merged.plans[0]?.sections[0]?.note).toBe("Dr. Santos");
  });
});
