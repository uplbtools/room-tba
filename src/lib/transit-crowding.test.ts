import { describe, expect, test } from "bun:test";
import {
  type ClassChangePeak,
  campusClock,
  classChangePeaks,
  crowdingHint,
} from "./transit-crowding";

/** Epoch ms for a Los Baños wall-clock time (UTC+8, no DST). */
const manila = (day: number, hour: number, minute = 0) =>
  Date.UTC(2026, 9, day, hour - 8, minute);

// October 2026: the 8th is a Thursday, the 10th a Saturday, the 11th a Sunday.
const THU = 8;
const SAT = 10;
const SUN = 11;
const IN_SESSION = { startsOn: "2026-08-17", endsOn: "2026-12-18" };
const BREAK = { startsOn: "2026-01-19", endsOn: "2026-05-29" };

describe("campusClock", () => {
  test("reads campus time whatever the device zone", () => {
    expect(campusClock(manila(THU, 10, 5))).toEqual({ day: 3, minute: 605 });
    // 11:30 PM Thursday in Los Baños is still Thursday, though UTC says 15:30.
    expect(campusClock(manila(THU, 23, 30))).toEqual({ day: 3, minute: 1410 });
    expect(campusClock(manila(SUN, 0, 10)).day).toBe(6);
  });
});

describe("classChangePeaks", () => {
  test("counts ends and starts per weekday, keeping busy times only", () => {
    const schedules = [
      ...Array.from({ length: 5 }, () => ["TTh 8:30 AM-10:00 AM"]),
      ...Array.from({ length: 4 }, () => ["MWF 10:00 AM-11:00 AM"]),
      ["TBA"],
      null,
      ["not a schedule"],
    ];
    const peaks = classChangePeaks(schedules, 5);
    // Tuesday and Thursday: 5 starts at 8:30, 5 ends at 10:00. The 4 MWF
    // sections never reach the threshold.
    expect(peaks).toEqual([
      { day: 1, minute: 510, ends: 0, starts: 5 },
      { day: 1, minute: 600, ends: 5, starts: 0 },
      { day: 3, minute: 510, ends: 0, starts: 5 },
      { day: 3, minute: 600, ends: 5, starts: 0 },
    ]);
  });

  test("ends and starts at the same minute are judged separately", () => {
    const schedules = [
      ...Array.from({ length: 5 }, () => ["M 7:00 AM-10:00 AM"]),
      ...Array.from({ length: 2 }, () => ["M 10:00 AM-11:00 AM"]),
    ];
    expect(classChangePeaks(schedules, 5)).toContainEqual({
      day: 0,
      minute: 600,
      ends: 5,
      starts: 0,
    });
  });
});

describe("crowdingHint", () => {
  const peaks: ClassChangePeak[] = [
    { day: 3, minute: 600, ends: 12, starts: 0 }, // Thu 10:00 AM ends
    { day: 3, minute: 870, ends: 0, starts: 9 }, // Thu 2:30 PM starts
  ];
  const base = { peaks, termWindow: IN_SESSION, fullReports: 0 };

  test("right after many classes end nearby", () => {
    for (const minute of [0, 5, 9]) {
      expect(crowdingHint({ ...base, now: manila(THU, 10, minute) })).toEqual({
        text: "Likely busy now: classes just ended nearby",
        source: "estimate",
      });
    }
    expect(crowdingHint({ ...base, now: manila(THU, 10, 10) })).toBeNull();
    expect(crowdingHint({ ...base, now: manila(THU, 9, 59) })).toBeNull();
  });

  test("in the minutes before many classes start", () => {
    expect(crowdingHint({ ...base, now: manila(THU, 14, 22) })?.text).toBe(
      "Likely busy now: classes start soon nearby",
    );
    expect(crowdingHint({ ...base, now: manila(THU, 14, 30) })).toBeNull();
  });

  test("class peaks only count on their weekday and in session", () => {
    // Same time on Saturday: no Saturday peak.
    expect(crowdingHint({ ...base, now: manila(SAT, 10, 3) })).toBeNull();
    expect(
      crowdingHint({ ...base, termWindow: BREAK, now: manila(THU, 10, 3) }),
    ).toBeNull();
    expect(
      crowdingHint({ ...base, termWindow: null, now: manila(THU, 10, 3) }),
    ).toBeNull();
  });

  test("weekday rush windows, shown from 30 minutes before", () => {
    const quiet = { peaks: [], termWindow: null, fullReports: 0 };
    expect(crowdingHint({ ...quiet, now: manila(THU, 17, 0) })?.text).toBe(
      "Usually busy 4:30 to 6 PM",
    );
    expect(crowdingHint({ ...quiet, now: manila(THU, 16, 0) })?.text).toBe(
      "Usually busy 4:30 to 6 PM",
    );
    expect(crowdingHint({ ...quiet, now: manila(THU, 18, 0) })).toBeNull();
    expect(crowdingHint({ ...quiet, now: manila(THU, 7, 15) })?.text).toBe(
      "Usually busy 7 to 8 AM",
    );
    expect(crowdingHint({ ...quiet, now: manila(THU, 12, 40) })?.text).toBe(
      "Usually busy 12 to 1 PM",
    );
    // Weekends have no rush window.
    expect(crowdingHint({ ...quiet, now: manila(SAT, 17, 0) })).toBeNull();
    expect(crowdingHint({ ...quiet, now: manila(THU, 21, 0) })).toBeNull();
  });

  test("a class change beats the rush-hour line", () => {
    const lunch: ClassChangePeak[] = [
      { day: 3, minute: 720, ends: 8, starts: 0 },
    ];
    expect(
      crowdingHint({ ...base, peaks: lunch, now: manila(THU, 12, 4) })?.text,
    ).toBe("Likely busy now: classes just ended nearby");
  });

  test("three full reports outrank every estimate", () => {
    expect(
      crowdingHint({ ...base, fullReports: 3, now: manila(SUN, 3, 0) }),
    ).toEqual({ text: "Busy: many jeeps reported full", source: "reports" });
    expect(
      crowdingHint({ ...base, fullReports: 2, now: manila(SUN, 3, 0) }),
    ).toBeNull();
  });
});
