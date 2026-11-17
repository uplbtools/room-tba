import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, test, vi } from "vitest";
import PlannerFindSchedule from "@ui/planner/PlannerFindSchedule.svelte";
import type { ClassMapValue } from "@lib/types";

let id = 1;
const row = (over: Partial<ClassMapValue>): ClassMapValue => ({
  id: id++,
  courseCode: "CMSC 123",
  section: "A",
  type: "LEC",
  schedule: ["MW 08:00AM-09:00AM"],
  roomCode: null,
  directions: null,
  courseTitle: null,
  roomId: null,
  termId: 1262,
  ...over,
});

const rows = [
  row({ section: "A" }),
  row({ section: "B", schedule: ["TTh 08:00AM-09:00AM"] }),
  row({ courseCode: "MATH 55", section: "X" }),
];

describe("PlannerFindSchedule", () => {
  test("lists the schedules without an overlap and hands one back", async () => {
    const onpick = vi.fn();
    render(PlannerFindSchedule, {
      rows,
      courseCodes: ["CMSC 123", "MATH 55"],
      onpick,
    });
    await fireEvent.click(
      screen.getByRole("button", { name: "Find schedules" }),
    );
    expect(await screen.findByText(/1 schedule found/)).toBeTruthy();
    await fireEvent.click(
      screen.getByRole("button", { name: "Use this schedule" }),
    );
    const picked = onpick.mock.calls[0][0];
    expect(picked.map((o: { section: string }) => o.section).sort()).toEqual([
      "B",
      "X",
    ]);
  });

  test("says so when every combination overlaps", async () => {
    render(PlannerFindSchedule, {
      rows: [row({}), row({ courseCode: "MATH 55", section: "X" })],
      courseCodes: ["CMSC 123", "MATH 55"],
      onpick: vi.fn(),
    });
    await fireEvent.click(
      screen.getByRole("button", { name: "Find schedules" }),
    );
    expect(await screen.findByText(/time overlap/)).toBeTruthy();
  });
});
