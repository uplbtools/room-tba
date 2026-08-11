import { render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, test } from "vitest";
import { directionsStore } from "@lib/store.svelte";
import {
  expectNoHorizontalOverflow,
  mountAtWidth,
} from "@test/layout-assertions";
import type { Journey } from "@lib/travel-graph/journey";
import DirectionsPanel from "./DirectionsPanel.svelte";

const walkJourney: Journey = {
  id: "walk",
  kind: "walk",
  seconds: 12 * 60,
  meters: 910,
  walkMeters: 910,
  legs: [
    {
      kind: "walk",
      seconds: 12 * 60,
      meters: 910,
      coordinates: [
        [121.24, 14.16],
        [121.241, 14.161],
      ],
    },
  ],
  fare: null,
  geometrySource: "walk-graph",
};

function seedReadyDirections() {
  directionsStore.close();
  directionsStore.phase = "ready";
  directionsStore.origin = {
    lat: 14.16,
    lng: 121.24,
    label: "Your location",
  };
  directionsStore.destination = {
    lat: 14.161,
    lng: 121.241,
    label: "CDC Building",
  };
  directionsStore.journeys = [walkJourney];
  directionsStore.selectedId = walkJourney.id;
  directionsStore.navigating = false;
}

describe("DirectionsPanel", () => {
  beforeEach(() => {
    directionsStore.close();
  });

  test.each([320, 768])(
    "option card and actions fit without horizontal overflow at %ipx",
    (width) => {
      mountAtWidth(width);
      seedReadyDirections();
      const { container } = render(DirectionsPanel);

      expect(screen.getByText("12 min")).toBeInTheDocument();
      expect(screen.getByText("Walk")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Show on map" })).toBeVisible();
      expect(screen.getByRole("button", { name: "Start" })).toBeVisible();
      expect(container.querySelector(".option--selected")).toBeTruthy();

      expectNoHorizontalOverflow(container as HTMLElement);
      const panel = container.querySelector(".directions");
      expect(panel).toBeTruthy();
      expectNoHorizontalOverflow(panel as HTMLElement);
    },
  );

  test("does not list stops or Add stop in the sheet", () => {
    mountAtWidth(320);
    seedReadyDirections();
    directionsStore.waypoints = [
      { lat: 14.1605, lng: 121.2405, label: "Main Library" },
    ];
    render(DirectionsPanel);
    expect(screen.queryByText("Main Library")).toBeNull();
    expect(screen.queryByText("Your location")).toBeNull();
    expect(screen.queryByRole("button", { name: "Add stop" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Close directions" }),
    ).toBeNull();
  });
});
