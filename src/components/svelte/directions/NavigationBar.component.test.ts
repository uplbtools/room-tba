import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, test } from "vitest";
import { directionsStore, locationStore } from "@lib/store.svelte";
import type { Journey } from "@lib/travel-graph/journey";
import NavigationBar from "./NavigationBar.svelte";
import NavigationBanner from "./NavigationBanner.svelte";

const transit: Journey = {
  id: "forestry",
  kind: "transit",
  seconds: 19 * 60,
  meters: 2040,
  walkMeters: 540,
  legs: [
    {
      kind: "walk",
      seconds: 7 * 60,
      meters: 540,
      coordinates: [
        [121.241, 14.1648],
        [121.2387, 14.162],
      ],
    },
    {
      kind: "ride",
      routeId: "forestry",
      routeName: "Forestry",
      color: "#16a34a",
      fare: { regular: 14, discounted: 12 },
      boardStopName: "UP University Health Service",
      alightStopName: "Forestry Residence Hall (FOREHA)",
      stopCount: 9,
      waitSeconds: 300,
      seconds: 12 * 60,
      meters: 1500,
      coordinates: [
        [121.2387, 14.162],
        [121.2342, 14.1522],
      ],
    },
  ],
  fare: { regular: 14, discounted: 12 },
  geometrySource: "walk-graph",
};

function seedNavigating() {
  directionsStore.close();
  directionsStore.phase = "ready";
  directionsStore.origin = {
    lat: 14.1648,
    lng: 121.241,
    label: "Your location",
  };
  directionsStore.destination = {
    lat: 14.1522,
    lng: 121.2342,
    label: "Forestry Residence Hall",
  };
  directionsStore.journeys = [transit];
  directionsStore.selectedId = transit.id;
  directionsStore.startNavigation();
}

describe("navigation", () => {
  beforeEach(() => {
    locationStore.coords = null;
    seedNavigating();
  });

  test("the sheet quotes the route card's distance and exits with X / Exit", async () => {
    render(NavigationBar);
    // Same formatter and total as the route card: 2.0 km, not a re-measure.
    expect(screen.getByText(/^2\.0 km, arrives /)).toBeInTheDocument();
    expect(screen.queryByText("⇅")).toBeNull();
    expect(screen.queryByRole("button", { name: /route options/i })).toBeNull();

    await fireEvent.click(
      screen.getByRole("button", { name: "Exit navigation" }),
    );
    expect(directionsStore.navigating).toBe(false);
  });

  test("the sheet lists every step", () => {
    render(NavigationBar);
    const steps = screen.getByRole("list", { name: "Steps" });
    expect(steps.textContent).toContain(
      "Walk to UP University Health Service stop",
    );
    expect(steps.textContent).toContain("Board the Forestry jeep");
    expect(steps.textContent).toContain(
      "Get off at Forestry Residence Hall (FOREHA)",
    );
  });

  test("the banner shows the current step, and Re-centre only once panned", async () => {
    render(NavigationBanner);
    expect(
      screen.getByText("Walk to UP University Health Service stop"),
    ).toBeVisible();
    expect(screen.getByText("Then: Board the Forestry jeep")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Re-centre" })).toBeNull();

    directionsStore.releaseCamera();
    expect(
      await screen.findByRole("button", { name: "Re-centre" }),
    ).toBeVisible();
  });
});
