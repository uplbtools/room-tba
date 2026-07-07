import { describe, expect, it } from "bun:test";
import { buildPlanIcs } from "./ics.js";
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
      schedule: ["MWF 08:00AM-09:00AM"],
      roomCode: "ICS MH1",
      courseTitle: null,
    },
    {
      courseCode: "PE 2",
      section: "C-1",
      type: "LEC",
      schedule: ["TBA"],
      roomCode: null,
      courseTitle: null,
    },
  ],
};

// 2026-01-19 is a Monday.
const term = { startsOn: "2026-01-19 00:00:00", endsOn: "2026-05-30 00:00:00" };
const now = new Date(Date.UTC(2026, 0, 15));

describe("buildPlanIcs", () => {
  it("emits one recurring VEVENT per schedule string, skipping TBA", () => {
    const ics = buildPlanIcs(plan, term, now);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1);
    expect(ics).toContain("SUMMARY:CMSC 128 LEC AB-1L");
    expect(ics).toContain("LOCATION:ICS MH1");
    expect(ics).not.toContain("PE 2");
  });

  it("maps days to BYDAY and bounds recurrence by term end", () => {
    const ics = buildPlanIcs(plan, term, now);
    expect(ics).toContain(
      "RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR;UNTIL=20260530T155900Z",
    );
  });

  it("converts Manila wall time to UTC (8AM Manila = 00:00Z)", () => {
    const ics = buildPlanIcs(plan, term, now);
    expect(ics).toContain("DTSTART:20260119T000000Z");
    expect(ics).toContain("DTEND:20260119T010000Z");
  });

  it("starts on the first matching weekday within the term", () => {
    // Term starting Tuesday 2026-01-20: first MWF slot is Wednesday the 21st.
    const ics = buildPlanIcs(plan, { ...term, startsOn: "2026-01-20" }, now);
    expect(ics).toContain("DTSTART:20260121T000000Z");
  });

  it("falls back to per-day one-week events without term dates", () => {
    const ics = buildPlanIcs(plan, null, now);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(3);
    expect(ics).not.toContain("RRULE");
  });

  it("uses CRLF line endings and escapes special characters", () => {
    const ics = buildPlanIcs(
      {
        ...plan,
        sections: [{ ...plan.sections[0], roomCode: "Room A; B, C" }],
      },
      term,
      now,
    );
    expect(ics).toContain("\r\n");
    expect(ics.includes("\n") && !ics.includes("\r\n")).toBe(false);
    expect(ics).toContain("LOCATION:Room A\\; B\\, C");
  });
});
