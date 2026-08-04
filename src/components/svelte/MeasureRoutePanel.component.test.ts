import { render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, test } from "vitest";
import { measureRouteStore } from "@lib/store.svelte";
import {
  expectNoHorizontalOverflow,
  mountAtWidth,
} from "@test/layout-assertions";
import MeasureRoutePanel from "./MeasureRoutePanel.svelte";

function seedTwoLegRoute() {
  measureRouteStore.addWaypoint(14.16, 121.24);
  measureRouteStore.addWaypoint(14.161, 121.24);
  measureRouteStore.addWaypoint(14.161, 121.241);
  measureRouteStore.setResults(measureRouteStore.waypoints, {
    walk: [
      { seconds: 240, meters: 300 },
      { seconds: 120, meters: 150 },
    ],
    cycle: [
      { seconds: 72, meters: 300 },
      { seconds: 36, meters: 150 },
    ],
    drive: [{ seconds: 60, meters: 500 }, null],
  });
}

describe("MeasureRoutePanel", () => {
  beforeEach(() => {
    measureRouteStore.disable();
    measureRouteStore.enable();
  });

  test.each([320, 768])("fits without horizontal overflow at %ipx", (width) => {
    mountAtWidth(width);
    seedTwoLegRoute();
    const { container } = render(MeasureRoutePanel);
    expectNoHorizontalOverflow(container as HTMLElement);
  });

  test("prompts for taps before two waypoints exist", () => {
    render(MeasureRoutePanel);
    expect(screen.getByText(/tap the map/i)).toBeInTheDocument();
    measureRouteStore.addWaypoint(14.16, 121.24);
    expect(measureRouteStore.waypoints).toHaveLength(1);
  });

  test("mode pills show totals, and 'no route' when a leg has none", () => {
    seedTwoLegRoute();
    render(MeasureRoutePanel);
    expect(screen.getByRole("button", { name: "Walk" })).toHaveTextContent(
      "6 min",
    );
    // Drive has an unroutable second leg, so the pill degrades.
    expect(
      screen.getByRole("button", { name: "Car / e-bike" }),
    ).toHaveTextContent("no route");
  });

  test("switching mode updates the distance line and leg breakdown", async () => {
    seedTwoLegRoute();
    render(MeasureRoutePanel);
    expect(screen.getByText(/450\s?m over 3 stops/i)).toBeInTheDocument();
    screen.getByRole("button", { name: "Car / e-bike" }).click();
    expect(measureRouteStore.mode).toBe("drive");
    expect(await screen.findByText(/no drivable path/i)).toBeInTheDocument();
  });

  test("undo pops the last waypoint and clear empties the route", () => {
    seedTwoLegRoute();
    render(MeasureRoutePanel);
    screen.getByRole("button", { name: /undo last waypoint/i }).click();
    expect(measureRouteStore.waypoints).toHaveLength(2);
    screen.getByRole("button", { name: /clear waypoints/i }).click();
    expect(measureRouteStore.waypoints).toHaveLength(0);
    expect(measureRouteStore.summaries.walk).toHaveLength(0);
  });

  test("close button turns the tool off", () => {
    render(MeasureRoutePanel);
    screen.getByRole("button", { name: /close measure route/i }).click();
    expect(measureRouteStore.active).toBe(false);
  });

  test("always credits OpenStreetMap for the path network", () => {
    render(MeasureRoutePanel);
    expect(
      screen.getByText(/paths © OpenStreetMap contributors/i),
    ).toBeInTheDocument();
  });
});
