import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { scheduleRouteStore } from "@lib/store.svelte";

const SAMPLE_JSON = JSON.stringify([
  {
    course_code: "E2E 101",
    section: "AB",
    type: "LEC",
    schedule: ["MWF 8-9"],
  },
]);

describe("ScheduleRouteStore", () => {
  beforeEach(() => {
    scheduleRouteStore.clearImport();
    sessionStorage.clear();
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
                  schedule: ["MWF 8-9"],
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

  test("importText parses rows and matches classes", async () => {
    const ok = await scheduleRouteStore.importText(SAMPLE_JSON);
    expect(ok).toBe(true);
    expect(scheduleRouteStore.importedRows).toHaveLength(1);
    expect(scheduleRouteStore.hasImport).toBe(true);
    expect(scheduleRouteStore.matches.length).toBeGreaterThan(0);
  });

  test("importText rejects invalid payload", async () => {
    const ok = await scheduleRouteStore.importText("not json");
    expect(ok).toBe(false);
    expect(scheduleRouteStore.importError).toBeTruthy();
  });

  test("selectWeekday updates weekday state", async () => {
    await scheduleRouteStore.importText(SAMPLE_JSON);
    scheduleRouteStore.selectWeekday("T");
    expect(scheduleRouteStore.selectedWeekday).toBe("T");
    const stored = sessionStorage.getItem("room-tba-schedule-import");
    expect(stored).toContain('"T"');
  });
});
