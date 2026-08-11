import { render, screen } from "@testing-library/svelte";
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
});
