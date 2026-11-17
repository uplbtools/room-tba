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
    const ics = buildPlanIcs(plan, term, { now });
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1);
    expect(ics).toContain("SUMMARY:CMSC 128 LEC (AB-1L)");
    expect(ics).toContain("LOCATION:ICS MH1");
    expect(ics).not.toContain("PE 2");
  });

  it("maps days to BYDAY and bounds recurrence by term end", () => {
    const ics = buildPlanIcs(plan, term, { now });
    expect(ics).toContain(
      "RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR;UNTIL=20260530T155900Z",
    );
  });

  it("uses Asia/Manila local times with a VTIMEZONE block", () => {
    const ics = buildPlanIcs(plan, term, { now });
    expect(ics).toContain("DTSTART;TZID=Asia/Manila:20260119T080000");
    expect(ics).toContain("DTEND;TZID=Asia/Manila:20260119T090000");
    expect(ics).toContain("BEGIN:VTIMEZONE\r\nTZID:Asia/Manila");
    expect(ics).toContain("TZOFFSETTO:+0800");
  });

  it("starts on the first matching weekday within the term", () => {
    // Term starting Tuesday 2026-01-20: first MWF slot is Wednesday the 21st.
    const ics = buildPlanIcs(
      plan,
      { ...term, startsOn: "2026-01-20" },
      { now },
    );
    expect(ics).toContain("DTSTART;TZID=Asia/Manila:20260121T080000");
  });

  it("falls back to per-day one-week events without term dates", () => {
    const ics = buildPlanIcs(plan, null, { now });
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
      { now },
    );
    expect(ics).toContain("\r\n");
    expect(ics.includes("\n") && !ics.includes("\r\n")).toBe(false);
    expect(ics).toContain("LOCATION:Room A\\; B\\, C");
  });

  it("takes first and last class day from the registrar calendar", () => {
    const ics = buildPlanIcs({ ...plan, termId: 1261 }, term, { now });
    expect(ics).toContain("DTSTART;TZID=Asia/Manila:20260803T080000");
    expect(ics).toContain("UNTIL=20261127T155900Z");
  });

  it("excludes holidays and breaks on the days the class meets", () => {
    const ics = buildPlanIcs({ ...plan, termId: 1261 }, term, { now });
    expect(ics).toContain(
      "EXDATE;TZID=Asia/Manila:20260821T080000,20260831T080000,20261030T080000",
    );
  });

  it("adds no EXDATE when no holiday falls on a class day", () => {
    expect(buildPlanIcs(plan, term, { now })).not.toContain("EXDATE");
  });

  it("emits final exams as one-off events", () => {
    const ics = buildPlanIcs(plan, term, {
      now,
      finals: [
        {
          id: 7,
          termId: 1252,
          courseCode: "CMSC 128",
          section: null,
          courseTitle: null,
          roomId: 12,
          roomCode: "ICS MH1",
          examDate: "2026-05-18",
          startsAt: "13:00:00",
          endsAt: "16:00:00",
          source: "test",
        },
      ],
      roomIds: { "ICS MH1": 12 },
    });
    expect(ics).toContain("SUMMARY:CMSC 128 Final Exam");
    expect(ics).toContain("DTSTART;TZID=Asia/Manila:20260518T130000");
    expect(ics).toContain("DTEND;TZID=Asia/Manila:20260518T160000");
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
  });

  it("links a room to its Room TBA page", () => {
    const ics = buildPlanIcs(plan, term, { now, roomIds: { "ICS MH1": 12 } });
    expect(ics).toMatch(/\r\nURL:https?:\/\/[^\r]+\/room\/ics-mh1-12\//);
    expect(buildPlanIcs(plan, term, { now })).not.toContain("URL:");
  });

  it("folds lines to 75 octets", () => {
    const ics = buildPlanIcs(plan, term, { now, roomIds: { "ICS MH1": 12 } });
    for (const line of ics.split("\r\n")) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
  });
});
