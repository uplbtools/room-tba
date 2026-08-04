import { render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, test } from "vitest";
import { travelTimeStore } from "@lib/store.svelte";
import {
  expectNoHorizontalOverflow,
  mountAtWidth,
} from "@test/layout-assertions";
import TravelTimeLegend from "./TravelTimeLegend.svelte";

describe("TravelTimeLegend", () => {
  beforeEach(() => {
    travelTimeStore.disable();
    travelTimeStore.enable();
  });

  test.each([320, 768])("fits without horizontal overflow at %ipx", (width) => {
    mountAtWidth(width);
    const { container } = render(TravelTimeLegend);
    expectNoHorizontalOverflow(container as HTMLElement);
  });

  test("prompts for an origin before any tap", () => {
    render(TravelTimeLegend);
    expect(screen.getByText(/tap the map/i)).toBeInTheDocument();
  });

  test("shows the minute ramp once results are in", () => {
    travelTimeStore.setOrigin(14.165, 121.241);
    travelTimeStore.status = "ready";
    render(TravelTimeLegend);
    expect(screen.getByText("30+ min")).toBeInTheDocument();
    expect(screen.queryByText(/tap the map/i)).not.toBeInTheDocument();
  });

  test("always credits OpenStreetMap for the path network", () => {
    render(TravelTimeLegend);
    expect(
      screen.getByText(/paths © OpenStreetMap contributors/i),
    ).toBeInTheDocument();
  });

  test("close button turns the tool off", async () => {
    render(TravelTimeLegend);
    screen.getByRole("button", { name: /turn off travel time/i }).click();
    expect(travelTimeStore.active).toBe(false);
  });
});
