import { describe, expect, it } from "bun:test";
import { appScreenFromPath } from "./app-screen-path";

describe("appScreenFromPath", () => {
  it("maps the full-screen app routes", () => {
    expect(appScreenFromPath("/planner")).toBe("planner");
    expect(appScreenFromPath("/planner/")).toBe("planner");
    expect(appScreenFromPath("/today")).toBe("today");
    expect(appScreenFromPath("/final-exams")).toBe("finals");
    expect(appScreenFromPath("/calendar/")).toBe("calendar");
  });

  it("leaves the map and entity pages alone", () => {
    expect(appScreenFromPath("/")).toBeNull();
    expect(appScreenFromPath("/building/ics")).toBeNull();
    expect(appScreenFromPath("/planner/extra")).toBeNull();
  });
});
