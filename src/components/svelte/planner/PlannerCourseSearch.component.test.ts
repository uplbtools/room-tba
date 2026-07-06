import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { beforeEach, describe, expect, test, vi } from "vitest";
import PlannerCourseSearch from "@ui/planner/PlannerCourseSearch.svelte";
import { plannerStore, termStore } from "@lib/store.svelte";
import type { ClassMapValue } from "@lib/types";

const rows: ClassMapValue[] = [
  {
    id: 1,
    courseCode: "CMSC 12",
    section: "G-1L",
    type: "LEC",
    schedule: ["T 07:00AM-10:00AM"],
    roomCode: "ICS PC2",
    directions: null,
    courseTitle: "Foundations of Computer Science",
    roomId: 1,
    termId: 1253,
  },
  {
    id: 2,
    courseCode: "CMSC 12",
    section: "G-1L",
    type: "LAB",
    schedule: ["F 01:00PM-04:00PM"],
    roomCode: "ICS PC2",
    directions: null,
    courseTitle: "Foundations of Computer Science",
    roomId: 1,
    termId: 1253,
  },
];

vi.stubGlobal(
  "fetch",
  vi.fn(() =>
    Promise.resolve(
      new Response(JSON.stringify({ rows, total: rows.length }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    ),
  ),
);

describe("PlannerCourseSearch", () => {
  beforeEach(() => {
    localStorage.clear();
    termStore.activeTermId = 1253;
    plannerStore.plans = [];
    plannerStore.activePlanIdByTerm = {};
  });

  test("lists courses on mount and adds an offering to the plan", async () => {
    render(PlannerCourseSearch);
    const courseButton = await screen.findByRole("button", {
      name: /CMSC 12/,
    });
    expect(courseButton).toBeVisible();
    expect(courseButton.textContent?.replace(/\s+/g, " ")).toContain(
      "1 section",
    );

    await fireEvent.click(courseButton);
    const addButton = await screen.findByRole("button", { name: "Add" });
    await fireEvent.click(addButton);

    await waitFor(() => {
      expect(plannerStore.activePlan?.sections).toHaveLength(2);
    });
    expect(plannerStore.activePlan?.label).toBe("Plan 1");
    expect(await screen.findByRole("button", { name: "✓" })).toBeVisible();
  });
});
