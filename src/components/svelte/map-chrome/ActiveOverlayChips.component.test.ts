import { fireEvent, render, screen } from "@testing-library/svelte";
import { tick } from "svelte";
import { beforeEach, describe, expect, test } from "vitest";
import { APP_MAP_OVERLAYS } from "@lib/map-overlay-sources.svelte";
import { mapOverlays } from "@lib/stores/map-overlays.svelte";
import {
  mapToolsStore,
  mapViewStore,
  measureRouteStore,
  sidePanelStore,
  sidebarStore,
  travelTimeStore,
} from "@lib/store.svelte";
import {
  expectNoHorizontalOverflow,
  mountAtWidth,
} from "@test/layout-assertions";
import ActiveOverlayChips from "./ActiveOverlayChips.svelte";

describe("ActiveOverlayChips", () => {
  beforeEach(() => {
    mapOverlays.resetForTests();
    for (const overlay of APP_MAP_OVERLAYS) mapOverlays.register(overlay);
    travelTimeStore.disable();
    measureRouteStore.disable();
    mapViewStore.eventsOnly = false;
    mapToolsStore.close();
    sidebarStore.changeOpened("map");
    sidePanelStore.setMobileSheetSnap("closed");
  });

  test("renders nothing while every overlay has its panel", () => {
    travelTimeStore.enable();
    const { container } = render(ActiveOverlayChips);
    expect(container.querySelector(".active-overlays")).toBeNull();
  });

  test("lists a stranded overlay; X clears it and the bar goes away", async () => {
    mapViewStore.toggleEventsOnly();
    const { container } = render(ActiveOverlayChips);
    expect(screen.getByText("Events only")).toBeInTheDocument();
    expect(screen.queryByText("Clear all")).toBeNull();
    await fireEvent.click(
      screen.getByRole("button", { name: "Remove Events only" }),
    );
    await tick();
    expect(mapViewStore.eventsOnly).toBe(false);
    expect(container.querySelector(".active-overlays")).toBeNull();
  });

  test("the label reopens the owning panel", async () => {
    mapViewStore.toggleEventsOnly();
    render(ActiveOverlayChips);
    await fireEvent.click(screen.getByRole("button", { name: "Events only" }));
    expect(mapToolsStore.open).toBe(true);
  });

  test("a tool shows once a sheet covers its card", async () => {
    travelTimeStore.enable();
    render(ActiveOverlayChips);
    expect(screen.queryByText("Walking time")).toBeNull();
    sidePanelStore.setMobileSheetSnap("peek");
    await tick();
    expect(screen.getByText("Walking time")).toBeInTheDocument();
  });

  test("Clear all appears with two or more and clears every one", async () => {
    mapViewStore.toggleEventsOnly();
    measureRouteStore.enable();
    sidePanelStore.setMobileSheetSnap("peek");
    render(ActiveOverlayChips);
    await fireEvent.click(screen.getByRole("button", { name: "Clear all" }));
    await tick();
    expect(mapViewStore.eventsOnly).toBe(false);
    expect(measureRouteStore.active).toBe(false);
  });

  test("fits a 320px phone without horizontal overflow", () => {
    mountAtWidth(320);
    mapViewStore.toggleEventsOnly();
    measureRouteStore.enable();
    travelTimeStore.enable();
    sidePanelStore.setMobileSheetSnap("peek");
    const { container } = render(ActiveOverlayChips);
    expectNoHorizontalOverflow(container as HTMLElement);
  });
});
