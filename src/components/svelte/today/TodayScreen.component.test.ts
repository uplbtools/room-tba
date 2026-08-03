import { fireEvent, render, screen } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import TodayScreen from "@ui/today/TodayScreen.svelte";
import {
  plannerStore,
  queryStore,
  scheduleRouteStore,
  sidebarStore,
  termStore,
} from "@lib/store.svelte";
import { mountAtWidth } from "@test/layout-assertions";
import type { ClassMapValue } from "@lib/types";

const row = (overrides: Partial<ClassMapValue> = {}): ClassMapValue => ({
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

describe("TodayScreen", () => {
  beforeEach(() => {
    // Only Date is faked: Svelte's scheduler still needs real timers/rAF.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-07-27T04:00:00Z")); // Monday noon in Manila
    localStorage.clear();
    termStore.activeTermId = 1252;
    plannerStore.plans = [];
    plannerStore.activePlanIdByTerm = {};
    scheduleRouteStore.clearImport();
    scheduleRouteStore.pendingDayRoute = false;
    sidebarStore.changeOpened("today");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("points an empty planner at the Planner instead of a blank screen", async () => {
    render(TodayScreen);
    expect(screen.getByText(/Add classes to see your day/)).toBeVisible();

    await fireEvent.click(
      screen.getByRole("button", { name: "Open the Planner" }),
    );
    expect(sidebarStore.panelOpen).toBe("planner");
  });

  test("lists today's classes in time order with a room link", async () => {
    plannerStore.addOffering([row({ schedule: ["M 03:00PM-05:00PM"] })]);
    plannerStore.addOffering([
      row({
        id: 2,
        courseCode: "MATH 27",
        section: "B-2",
        schedule: ["MW 07:00AM-08:00AM"],
        roomCode: "MB 101",
      }),
    ]);
    mountAtWidth(320);
    render(TodayScreen);

    const today = screen.getByRole("region", { name: /^Today,/ });
    expect(
      [...today.querySelectorAll(".today-entry__time")].map((el) =>
        el.textContent?.trim(),
      ),
    ).toEqual(["7:00 AM – 8:00 AM", "3:00 PM – 5:00 PM"]);

    // MW puts the same room on Monday and Wednesday; click today's.
    await fireEvent.click(
      today.querySelector<HTMLButtonElement>(".today-entry__room")!,
    );
    expect(queryStore.category).toBe("room");
    expect(queryStore.queryValue).toBe("MB 101");
    // Opening a room leaves the screen for the map behind it.
    expect(sidebarStore.panelOpen).toBe("map");
  });

  // #839: the day-route action stays visible when unusable — disabled with a
  // hint — so users learn it exists.
  test("Route my day is enabled when today has classes", () => {
    plannerStore.addOffering([row({ schedule: ["M 07:00AM-08:00AM"] })]);
    render(TodayScreen);

    expect(screen.getByRole("button", { name: /Route my day/ })).toBeEnabled();
  });

  test("Route my day is disabled with a hint when today has no classes", () => {
    plannerStore.addOffering([row({ schedule: ["T 07:00AM-08:00AM"] })]);
    render(TodayScreen);

    expect(screen.getByRole("button", { name: /Route my day/ })).toBeDisabled();
    expect(screen.getByText("No classes to route today.")).toBeVisible();
  });

  test("Route my day is disabled with a Planner hint when there is no plan", () => {
    render(TodayScreen);

    expect(screen.getByRole("button", { name: /Route my day/ })).toBeDisabled();
    expect(screen.getByText("Add classes in the Planner first.")).toBeVisible();
  });

  test("renders an explicit empty state per day and a distinct Sunday", () => {
    plannerStore.addOffering([row({ schedule: ["M 07:00AM-08:00AM"] })]);
    render(TodayScreen);

    // Tuesday has nothing planned.
    const tomorrow = screen.getByRole("region", { name: /^Tomorrow,/ });
    expect(
      tomorrow.querySelector(".today-day__empty")?.textContent?.trim(),
    ).toBe("No classes.");

    const sunday = screen.getByRole("region", { name: /^Sunday,/ });
    expect(sunday).toHaveClass("today-day--weekend");
    expect(sunday.querySelector(".today-day__empty")?.textContent?.trim()).toBe(
      "No classes on Sundays.",
    );
  });
});
