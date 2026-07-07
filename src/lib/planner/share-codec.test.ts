import { describe, expect, it } from "bun:test";
import { decodeSharePlan, encodeSharePlan } from "./share-codec.js";
import type { PlannerPlan } from "./types.js";

const plan: PlannerPlan = {
  id: "test-id",
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
    {
      courseCode: "CMSC 128",
      section: "AB-1L",
      type: "LAB",
      schedule: ["F 01:00PM-04:00PM"],
      roomCode: null,
      courseTitle: null,
    },
  ],
};

describe("share codec", () => {
  it("round-trips natural keys and term", () => {
    const decoded = decodeSharePlan(encodeSharePlan(plan));
    expect(decoded).toEqual({
      termId: 1252,
      refs: [
        { courseCode: "CMSC 128", section: "AB-1L", type: "LEC" },
        { courseCode: "CMSC 128", section: "AB-1L", type: "LAB" },
      ],
    });
  });

  it("produces URL-safe output", () => {
    expect(encodeSharePlan(plan)).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("survives unicode in fields", () => {
    const decoded = decodeSharePlan(
      encodeSharePlan({
        ...plan,
        sections: [{ ...plan.sections[0], courseCode: "FIL 20 – ñ" }],
      }),
    );
    expect(decoded?.refs[0].courseCode).toBe("FIL 20 – ñ");
  });

  it("returns null for garbage, truncated, or wrong-shape payloads", () => {
    expect(decodeSharePlan(null)).toBeNull();
    expect(decodeSharePlan("")).toBeNull();
    expect(decodeSharePlan("%%%not-base64%%%")).toBeNull();
    expect(decodeSharePlan(encodeSharePlan(plan).slice(0, 10))).toBeNull();
    expect(
      decodeSharePlan(btoa(JSON.stringify({ v: 2, t: 1, s: [] }))),
    ).toBeNull();
    expect(
      decodeSharePlan(
        btoa(JSON.stringify({ v: 1, t: 1252, s: [["only-two", "parts"]] })),
      ),
    ).toBeNull();
  });
});
