import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, test } from "vitest";
import { directionsStore } from "@lib/store.svelte";
import {
  expectNoHorizontalOverflow,
  mountAtWidth,
} from "@test/layout-assertions";
import DirectionsRouteChips from "./DirectionsRouteChips.svelte";

function seedDirections() {
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
  directionsStore.waypoints = [
    { lat: 14.1605, lng: 121.2405, label: "Main Library" },
  ];
  directionsStore.navigating = false;
}

describe("DirectionsRouteChips", () => {
  beforeEach(() => {
    directionsStore.close();
  });

  test("hidden when directions are idle", () => {
    const { container } = render(DirectionsRouteChips);
    expect(container.querySelector(".directions-route-chips")).toBeNull();
  });

  test.each([320, 768])(
    "lists origin, stop, destination with close under search at %ipx",
    (width) => {
      mountAtWidth(width);
      seedDirections();
      const { container } = render(DirectionsRouteChips);

      expect(screen.getByText("Your location")).toBeVisible();
      expect(screen.getByText("Main Library")).toBeVisible();
      expect(screen.getByText("CDC Building")).toBeVisible();
      expect(
        screen.getByRole("button", { name: "Remove stop Main Library" }),
      ).toBeVisible();
      expect(
        screen.getByRole("button", { name: "Close directions" }),
      ).toBeVisible();

      expectNoHorizontalOverflow(
        container.querySelector(".directions-route-chips") as HTMLElement,
      );
    },
  );

  test("tapping the start row arms picking, and Use my location shows for a pinned start", async () => {
    mountAtWidth(320);
    seedDirections();
    const { container } = render(DirectionsRouteChips);

    await fireEvent.click(
      screen.getByRole("button", {
        name: "Change starting point, now Your location",
      }),
    );
    expect(directionsStore.picking).toBe("origin");
    expect(screen.getByText("Choose a starting point")).toBeVisible();
    expect(screen.getByText(/Search above or tap the map/)).toBeVisible();
    // GPS is already the start, so there is nothing to go back to.
    expect(
      screen.queryByRole("button", { name: "Use my location" }),
    ).toBeNull();

    directionsStore.originFixed = true;
    expect(
      await screen.findByRole("button", { name: "Use my location" }),
    ).toBeVisible();
    expectNoHorizontalOverflow(
      container.querySelector(".directions-route-chips") as HTMLElement,
    );
  });

  test("a session opened from a pin asks for the destination", () => {
    directionsStore.openFrom({ lat: 14.16, lng: 121.24, label: "Dropped pin" });
    render(DirectionsRouteChips);
    expect(screen.getByText("Dropped pin")).toBeVisible();
    expect(screen.getByText("Choose a destination")).toBeVisible();
  });
});
