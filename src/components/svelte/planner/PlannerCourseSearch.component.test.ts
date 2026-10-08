import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { beforeEach, describe, expect, test, vi } from "vitest";
import PlannerCourseSearch from "@ui/planner/PlannerCourseSearch.svelte";
import { plannerStore, termStore } from "@lib/store.svelte";
import type { ClassMapValue } from "@lib/types";

const rows: ClassMapValue[] = [
  {
    id: 1,
    courseCode: "CMSC 12",
    section: "G",
    type: "LEC",
    schedule: ["WF 04:00PM-05:00PM"],
    roomCode: "EAA LH",
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
  {
    id: 3,
    courseCode: "CMSC 12",
    section: "G-5L",
    type: "LAB",
    schedule: ["TH 07:00AM-10:00AM"],
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

  test("starts with a search hint instead of listing the whole term", async () => {
    render(PlannerCourseSearch);
    expect(screen.getByText(/Type a course code/)).toBeVisible();
    expect(screen.queryByRole("button", { name: /CMSC 12/ })).toBeNull();
    await fireEvent.click(
      screen.getByRole("button", { name: "Browse all courses" }),
    );
    expect(
      await screen.findByRole("button", { name: /CMSC 12/ }),
    ).toBeVisible();
  });

  test("searches a course and adds an offering to the plan", async () => {
    render(PlannerCourseSearch);
    await fireEvent.input(screen.getByPlaceholderText(/Search courses/), {
      target: { value: "CMSC 12" },
    });
    const courseButton = await screen.findByRole("button", {
      name: /CMSC 12/,
    });
    expect(courseButton).toBeVisible();
    expect(courseButton.textContent?.replace(/\s+/g, " ")).toContain(
      "2 sections",
    );

    await fireEvent.click(courseButton);
    const addButton = (
      await screen.findAllByRole("button", { name: "Add" })
    )[0];
    await fireEvent.click(addButton);

    await waitFor(() => {
      expect(plannerStore.activePlan?.sections).toHaveLength(2);
    });
    expect(plannerStore.activePlan?.label).toBe("Untitled Plan 1");
    const added = await screen.findByRole("button", {
      name: /^Remove CMSC 12 \S+ from plan$/,
    });
    expect(added).toHaveTextContent("✓ Added");
    expect(added).toHaveAttribute("aria-pressed", "true");
    // Times read like people write them, with the room.
    expect(screen.getAllByText("Lec WF 4–5 PM in EAA LH")[0]).toBeVisible();
  });
});
