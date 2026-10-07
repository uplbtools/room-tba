import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, test } from "vitest";
import { directionsStore, locationStore } from "@lib/store.svelte";
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
    locationStore.failure = null;
  });

  function seedWaitingForLocation() {
    directionsStore.phase = "planning";
    directionsStore.origin = null;
    directionsStore.destination = {
      lat: 14.161,
      lng: 121.241,
      label: "CDC Building",
    };
  }

  test("offers a start point while waiting on location", async () => {
    seedWaitingForLocation();
    render(DirectionsPanel);

    expect(screen.getByText(/Waiting for your location/)).toBeInTheDocument();
    await fireEvent.click(
      screen.getByRole("button", { name: "Choose starting point" }),
    );
    expect(directionsStore.picking).toBe("origin");
  });

  test("stops waiting and says why when location fails", () => {
    seedWaitingForLocation();
    locationStore.failure =
      "Location access denied. Please enable it in your settings.";
    render(DirectionsPanel);

    expect(screen.queryByText(/Waiting for your location/)).toBeNull();
    expect(screen.getByText(/Location access denied/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Choose starting point" }),
    ).toBeVisible();
  });

  test.each([320, 768])(
    "option card and actions fit without horizontal overflow at %ipx",
    (width) => {
      mountAtWidth(width);
      seedReadyDirections();
      const { container } = render(DirectionsPanel);

      expect(screen.getAllByText("12 min").length).toBeGreaterThan(0);
      expect(screen.getByRole("tab", { name: "Walk, 12 min" })).toHaveAttribute(
        "aria-selected",
        "true",
      );
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

  test("mode tabs show each mode's time; cards run fastest first, marked", async () => {
    seedReadyDirections();
    const jeep: Journey = {
      ...walkJourney,
      id: "forestry",
      kind: "transit",
      seconds: 9 * 60,
      meters: 2000,
    };
    directionsStore.journeys = [jeep, walkJourney];
    directionsStore.selectedId = jeep.id;
    const { container } = render(DirectionsPanel);

    const walkTab = screen.getByRole("tab", { name: "Walk, 12 min" });
    const jeepTab = screen.getByRole("tab", { name: "Jeep, 9 min" });
    expect(jeepTab).toHaveAttribute("aria-selected", "true");
    const cards = container.querySelectorAll(".option");
    expect(cards[0]?.textContent).toContain("Fastest");
    expect(cards[1]?.textContent).not.toContain("Fastest");
    // The pinned Start row repeats the selected option, distance included.
    const startRow = container.querySelector(".directions__start-row");
    expect(startRow?.textContent).toContain("9 min");
    expect(startRow?.textContent).toContain("(2.0 km)");

    await fireEvent.click(walkTab);
    expect(directionsStore.selectedId).toBe("walk");
  });
});
