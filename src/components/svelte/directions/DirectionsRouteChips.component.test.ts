import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { directionsStore, locationStore } from "@lib/store.svelte";
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

const startField = () =>
  screen.getByRole("searchbox", { name: "Starting point" });
const destinationField = () =>
  screen.getByRole("searchbox", { name: "Destination" });

describe("DirectionsRouteChips", () => {
  beforeEach(() => {
    directionsStore.close();
    locationStore.failure = null;
  });

  test("hidden when directions are idle", () => {
    const { container } = render(DirectionsRouteChips);
    expect(container.querySelector(".directions-route-chips")).toBeNull();
  });

  test.each([320, 768])(
    "editable From / To with stops, swap and close at %ipx",
    (width) => {
      mountAtWidth(width);
      seedDirections();
      const { container } = render(DirectionsRouteChips);

      expect(startField()).toHaveValue("Your location");
      expect(destinationField()).toHaveValue("CDC Building");
      expect(screen.getByText("Main Library")).toBeVisible();
      expect(
        screen.getByRole("button", { name: "Remove stop Main Library" }),
      ).toBeVisible();
      expect(
        screen.getByRole("button", { name: "Swap start and destination" }),
      ).toBeVisible();
      expect(
        screen.getByRole("button", { name: "Close directions" }),
      ).toBeVisible();

      expectNoHorizontalOverflow(
        container.querySelector(".directions-route-chips") as HTMLElement,
      );
    },
  );

  test("typing in a field arms that end and feeds the place search", async () => {
    mountAtWidth(320);
    seedDirections();
    const onSearchInput = vi.fn();
    const onSearchFocus = vi.fn();
    render(DirectionsRouteChips, { onSearchInput, onSearchFocus });

    await fireEvent.focus(startField());
    expect(directionsStore.picking).toBe("origin");
    expect(onSearchFocus).toHaveBeenCalled();
    expect(onSearchInput).toHaveBeenLastCalledWith("");

    await fireEvent.input(startField(), { target: { value: "Physi" } });
    expect(onSearchInput).toHaveBeenLastCalledWith("Physi");
    expect(startField()).toHaveValue("Physi");

    // A pick (here from the store, as a suggestion tap does) ends the edit.
    await directionsStore.setOrigin({
      lat: 14.162,
      lng: 121.242,
      label: "Physical Sciences Building",
    });
    await fireEvent.blur(startField());
    expect(startField()).toHaveValue("Physical Sciences Building");
  });

  test("swap reverses the ends", async () => {
    seedDirections();
    directionsStore.waypoints = [];
    render(DirectionsRouteChips);
    await fireEvent.click(
      screen.getByRole("button", { name: "Swap start and destination" }),
    );
    expect(directionsStore.origin?.label).toBe("CDC Building");
    expect(directionsStore.originFixed).toBe(true);
    expect(directionsStore.destination?.label).toBe("Your location");
  });

  test("location denied: empty start with a retry", () => {
    seedDirections();
    directionsStore.origin = null;
    locationStore.failure =
      "Location access denied. Please enable it in your settings.";
    render(DirectionsRouteChips);

    expect(startField()).toHaveValue("");
    expect(startField()).toHaveAttribute(
      "placeholder",
      "Choose starting point",
    );
    expect(
      screen.getByRole("button", { name: "Use my location" }),
    ).toBeVisible();
  });

  test("a session opened from a pin asks for the destination", () => {
    directionsStore.openFrom({ lat: 14.16, lng: 121.24, label: "Dropped pin" });
    render(DirectionsRouteChips);
    expect(startField()).toHaveValue("Dropped pin");
    expect(destinationField()).toHaveValue("");
    expect(destinationField()).toHaveAttribute(
      "placeholder",
      "Choose destination",
    );
    // Straight to the empty destination, as GMaps does.
    expect(destinationField()).toHaveFocus();
  });

  test("Add stop opens a stop field armed for search or a map tap", async () => {
    seedDirections();
    directionsStore.waypoints = [];
    render(DirectionsRouteChips);
    await fireEvent.click(screen.getByRole("button", { name: "Add stop" }));
    expect(directionsStore.addingStop).toBe(true);
    expect(screen.getByRole("searchbox", { name: "Add a stop" })).toBeVisible();
  });
});
