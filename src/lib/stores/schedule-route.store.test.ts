import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  locationStore,
  plannerStore,
  scheduleRouteStore,
  termStore,
} from "@lib/store.svelte";

function seedPlan() {
  termStore.activeTermId = 1252;
  plannerStore.init();
  plannerStore.plans = [
    {
      id: "p1",
      label: "A",
      termId: 1252,
      sections: [
        {
          courseCode: "E2E 101",
          section: "AB",
          type: "LEC",
          schedule: ["MWF 08:00AM-09:00AM"],
          roomCode: "E2E-101",
          courseTitle: "E2E Course",
        },
      ],
    },
  ];
  plannerStore.activePlanIdByTerm = { "1252": "p1" };
}

describe("ScheduleRouteStore", () => {
  beforeEach(() => {
    scheduleRouteStore.clearImport();
    plannerStore.plans = [];
    plannerStore.activePlanIdByTerm = {};
    locationStore.coords = null;
    sessionStorage.clear();
    localStorage.clear();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/classes")) {
          return new Response(
            JSON.stringify({
              rows: [
                {
                  id: 1,
                  courseCode: "E2E 101",
                  section: "AB",
                  type: "LEC",
                  schedule: ["MWF 08:00AM-09:00AM"],
                  roomCode: "E2E-101",
                  roomId: 1,
                  termId: 1252,
                  directions: null,
                  courseTitle: "E2E Course",
                },
              ],
              total: 1,
            }),
            { status: 200 },
          );
        }
        if (url.includes("/api/rooms")) {
          return new Response(
            JSON.stringify({
              data: {
                building: { lat: 14.165, lon: 121.241 },
              },
            }),
            { status: 200 },
          );
        }
        return new Response("{}", { status: 404 });
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("importFromPlanner loads active plan rows and matches classes", async () => {
    seedPlan();
    const ok = await scheduleRouteStore.importFromPlanner();
    expect(ok).toBe(true);
    expect(scheduleRouteStore.importedRows).toHaveLength(1);
    expect(scheduleRouteStore.hasImport).toBe(true);
    expect(scheduleRouteStore.matches.length).toBeGreaterThan(0);
  });

  test("importFromPlanner with empty plan clears rows without error", async () => {
    const ok = await scheduleRouteStore.importFromPlanner();
    expect(ok).toBe(false);
    expect(scheduleRouteStore.hasImport).toBe(false);
    expect(scheduleRouteStore.importError).toBeNull();
  });

  test("selectWeekday updates weekday state", async () => {
    seedPlan();
    await scheduleRouteStore.importFromPlanner();
    scheduleRouteStore.selectWeekday("T");
    expect(scheduleRouteStore.selectedWeekday).toBe("T");
    const stored = sessionStorage.getItem("room-tba-schedule-import");
    expect(stored).toContain('"T"');
  });

  test("routeDay generates map waypoints and clears stale route state", async () => {
    seedPlan();
    await scheduleRouteStore.importFromPlanner();
    locationStore.coords = [121.24, 14.16];

    scheduleRouteStore.routeDay("M");

    expect(scheduleRouteStore.routedWeekday).toBe("M");
    expect(locationStore.routeWaypoints).toEqual([
      [121.24, 14.16],
      [121.241, 14.165],
    ]);

    scheduleRouteStore.focusStop(0);
    expect(scheduleRouteStore.focusedStopIndex).toBe(0);

    scheduleRouteStore.selectWeekday("T");
    expect(scheduleRouteStore.routedWeekday).toBeNull();
    expect(scheduleRouteStore.focusedStopIndex).toBeNull();
    expect(locationStore.routeWaypoints).toBeNull();
  });
});
