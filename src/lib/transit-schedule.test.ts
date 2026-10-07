import { describe, expect, test } from "bun:test";
import {
  routeScheduleSummary,
  SCHEDULE_NOT_PUBLISHED,
  summarizeSchedule,
} from "./transit-schedule";

describe("summarizeSchedule", () => {
  test("says the schedule is not published instead of inventing one", () => {
    const summary = routeScheduleSummary("kaliwa-kanan");
    expect(summary.published).toBe(false);
    expect(summary.hours).toBe(SCHEDULE_NOT_PUBLISHED);
    expect(summary.frequency).toBe("Frequency not published");
  });

  test("lists fixed departures and counts trips", () => {
    expect(routeScheduleSummary("uplb-to-buendia")).toMatchObject({
      published: true,
      hours: "Daily · 5:00 AM",
      frequency: "1 trip a day",
    });
    expect(routeScheduleSummary("buendia-to-uplb").hours).toBe(
      "Daily · 6:00 PM",
    );
    expect(routeScheduleSummary("uplb-to-upd").frequency).toBe("3 trips a day");
  });

  test("shows a service window when the route runs all day", () => {
    const summary = routeScheduleSummary("buendia-to-lb");
    expect(summary.hours).toBe("Daily · about 4:00 AM to about 10:00 PM");
    expect(summary.frequency).toBe("Frequency not published");
    expect(summary.note).toBe("Plus a midnight trip.");
  });

  test("uses a stated headway", () => {
    expect(
      summarizeSchedule({ days: "Weekdays", headwayMinutes: 10 }).frequency,
    ).toBe("Every 10 min");
  });
});
