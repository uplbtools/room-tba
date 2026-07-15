import { render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, test, vi } from "vitest";

// The screen's open-effect refreshes sections and finals over the network;
// answer with empty results so tests stay offline.
vi.stubGlobal(
  "fetch",
  vi.fn((input: RequestInfo | URL) =>
    Promise.resolve(
      new Response(
        String(input).includes("/api/classes")
          ? JSON.stringify({ rows: [], total: 0 })
          : "[]",
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    ),
  ),
);
import PlannerScreen from "@ui/planner/PlannerScreen.svelte";
import { plannerStore, termStore } from "@lib/store.svelte";
import type { ClassMapValue } from "@lib/types";

const row = (overrides: Partial<ClassMapValue>): ClassMapValue => ({
  id: 1,
  courseCode: "CMSC 128",
  section: "AB-1L",
  type: "LEC",
  schedule: ["MW 07:00AM-08:00AM"],
  roomCode: "ICS MH1",
  directions: null,
  courseTitle: "Software Engineering",
  roomId: 1,
  termId: 1252,
  ...overrides,
});

describe("PlannerScreen", () => {
  beforeEach(() => {
    localStorage.clear();
    termStore.activeTermId = 1252;
    plannerStore.plans = [];
    plannerStore.activePlanIdByTerm = {};
    vi.mocked(fetch).mockClear();
  });

  test("renders as a dialog with course search and an empty grid", () => {
    render(PlannerScreen);
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByPlaceholderText(/Search courses/i)).toBeVisible();
    expect(document.querySelector(".planner-grid")).toBeTruthy();
    expect(document.querySelectorAll(".planner-block")).toHaveLength(0);
  });

  test("renders grid blocks and section list for a seeded plan", () => {
    plannerStore.addOffering([
      row({}),
      row({ id: 2, type: "LAB", schedule: ["F 01:00PM-04:00PM"] }),
    ]);
    render(PlannerScreen);
    // MW LEC = 2 blocks + F LAB = 1 block
    expect(document.querySelectorAll(".planner-block")).toHaveLength(3);
    // Sections list groups by course: a "CMSC 128" header + its parts.
    expect(
      document.querySelector(".planner-offering__course")?.textContent,
    ).toContain("CMSC 128");
    expect(
      [...document.querySelectorAll(".planner-offering__part-section")].map(
        (el) => el.textContent?.trim(),
      ),
    ).toContain("AB-1L");
    expect(screen.getByText("All clear")).toBeVisible();
  });

  test("shows conflict badge and outlines for overlapping sections", () => {
    plannerStore.addOffering([row({})]);
    plannerStore.addOffering([
      row({
        id: 5,
        courseCode: "MATH 27",
        section: "B-2",
        schedule: ["M 07:30AM-08:30AM"],
      }),
    ]);
    render(PlannerScreen);
    expect(screen.getByText("1 conflict")).toBeVisible();
    expect(
      document.querySelectorAll(".planner-block--conflict").length,
    ).toBeGreaterThan(0);
  });

  test("lists TBA sections under Unscheduled", () => {
    plannerStore.addOffering([
      row({ courseCode: "PE 2", section: "C-1", schedule: ["TBA"] }),
    ]);
    render(PlannerScreen);
    expect(screen.getByText("Unscheduled (TBA)")).toBeVisible();
    expect(document.querySelectorAll(".planner-block")).toHaveLength(0);
  });

  // Regression (#506 drag-to-switch-section): the store's `open` flag was
  // removed, but the refresh effect still gated on it, so section
  // alternatives were never fetched and dragging a block had no targets.
  test("fetches section alternatives on mount so drag-to-switch has targets", async () => {
    plannerStore.addOffering([row({})]);
    render(PlannerScreen);
    await vi.waitFor(() => {
      const urls = vi.mocked(fetch).mock.calls.map((c) => String(c[0]));
      expect(
        urls.some(
          (u) => u.includes("/api/classes") && u.includes("course_code=CMSC"),
        ),
      ).toBe(true);
    });
  });

  test("plan tabs switch between plans", async () => {
    plannerStore.addOffering([row({})]);
    plannerStore.createPlan();
    render(PlannerScreen);
    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((t) => t.textContent?.trim())).toEqual([
      "Untitled Plan 1",
      "Untitled Plan 2",
    ]);
  });
});
