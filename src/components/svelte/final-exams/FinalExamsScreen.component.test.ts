import { fireEvent, render, screen } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import FinalExamsScreen from "@ui/final-exams/FinalExamsScreen.svelte";
import { sidebarStore, termStore } from "@lib/store.svelte";

const fetchFinalExams = vi.hoisted(() => vi.fn());
vi.mock("@lib/final-exams", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@lib/final-exams")>()),
  fetchFinalExams,
}));

describe("FinalExamsScreen", () => {
  beforeEach(() => {
    termStore.activeTermId = 1252;
    sidebarStore.changeOpened("finals");
  });

  afterEach(() => {
    fetchFinalExams.mockReset();
  });

  test("an empty term hides the filter and links to the academic calendar", async () => {
    fetchFinalExams.mockResolvedValue([]);
    render(FinalExamsScreen);

    const action = await screen.findByRole("button", {
      name: "See academic calendar",
    });
    expect(screen.getByRole("dialog", { name: "Final exams" })).toBeVisible();
    expect(
      screen.queryByRole("searchbox", { name: "Filter final exams" }),
    ).toBeNull();
    // The source caveat is a collapsed disclosure, not a pinned paragraph.
    expect(
      screen.getByText("About these times").closest("details"),
    ).not.toHaveAttribute("open");

    await fireEvent.click(action);
    expect(sidebarStore.panelOpen).toBe("calendar");
  });

  test("shows the filter once exams exist", async () => {
    fetchFinalExams.mockResolvedValue([
      {
        id: 1,
        termId: 1252,
        courseCode: "CMSC 128",
        section: "AB",
        courseTitle: "Software Engineering",
        roomId: 1,
        roomCode: "ICS MH1",
        examDate: "2026-12-01",
        startsAt: "08:00",
        endsAt: "10:00",
      },
    ]);
    render(FinalExamsScreen);

    expect(
      await screen.findByRole("searchbox", { name: "Filter final exams" }),
    ).toBeVisible();
  });
});
