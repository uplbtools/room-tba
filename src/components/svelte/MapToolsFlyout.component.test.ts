import { render, screen, waitFor, within } from "@testing-library/svelte";
import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  mapToolsStore,
  mapViewStore,
  measureRouteStore,
  plannerStore,
  termStore,
  toastStore,
  travelTimeStore,
} from "@lib/store.svelte";
import { mountAtWidth } from "@test/layout-assertions";
import MapToolsFlyout from "./MapToolsFlyout.svelte";

// The legend reads campus data from the app root's context.
vi.mock("@lib/context", () => ({
  getAppData: () => () => ({ events: null, loaded: false }),
}));

async function openSheet() {
  mapToolsStore.toggle();
  render(MapToolsFlyout);
  return screen.findByRole("dialog", { name: "Layers" });
}

describe("MapToolsFlyout", () => {
  beforeEach(() => {
    localStorage.clear();
    mapToolsStore.close();
    travelTimeStore.disable();
    measureRouteStore.disable();
    toastStore.clear();
    plannerStore.plans = [];
    plannerStore.activePlanIdByTerm = {};
    mapViewStore.showAll();
    mapViewStore.cameraDebug = false;
  });

  test("chip opens the tools panel", async () => {
    mountAtWidth(320);
    render(MapToolsFlyout);
    const chip = screen.getByRole("button", { name: "Layers" });
    chip.click();
    expect(mapToolsStore.open).toBe(true);
    expect(
      await screen.findByRole("dialog", { name: "Layers" }),
    ).toBeInTheDocument();
  });

  test("map type is a single choice between Default and Satellite", async () => {
    const sheet = await openSheet();
    const group = within(sheet).getByRole("radiogroup", { name: "Map type" });
    const radios = within(group).getAllByRole("radio");
    expect(radios.map((radio) => radio.textContent?.trim())).toEqual([
      "Default",
      "Satellite",
    ]);
    expect(
      within(group).getByRole("radio", { name: "Default" }),
    ).toHaveAttribute("aria-checked", "true");
    // 3D is a Map details switch now, not a third map type.
    expect(within(group).queryByRole("radio", { name: "3D" })).toBeNull();
    expect(
      within(sheet).getByRole("switch", { name: "3D" }),
    ).toBeInTheDocument();
  });

  test("map details are switches; orgs and landmarks toggle their pins", async () => {
    const sheet = await openSheet();
    const orgs = within(sheet).getByRole("switch", {
      name: "Orgs, units and offices",
    });
    expect(orgs).toHaveAttribute("aria-checked", "true");
    orgs.click();
    expect(mapViewStore.showOrgs).toBe(false);
    await waitFor(() => expect(orgs).toHaveAttribute("aria-checked", "false"));

    within(sheet)
      .getByRole("switch", { name: "Landmarks and establishments" })
      .click();
    expect(mapViewStore.showPlaces).toBe(false);
    expect(
      within(sheet).getByRole("switch", { name: "Makiling Trail" }),
    ).toBeInTheDocument();
  });

  test("My classes is off and disabled with a reason when there are no classes", async () => {
    mountAtWidth(320);
    const sheet = await openSheet();
    const myClasses = within(sheet).getByRole("switch", {
      name: "My classes",
    }) as HTMLButtonElement;
    expect(myClasses.disabled).toBe(true);
    // Highlight defaults on, but with nothing to highlight it must read off.
    expect(myClasses).toHaveAttribute("aria-checked", "false");
    expect(myClasses).toHaveAccessibleDescription(
      "Add classes in the Planner first",
    );
  });

  test("My classes switch flips the highlight when a plan has classes", async () => {
    termStore.activeTermId = 1252;
    plannerStore.addOffering([
      {
        id: 1,
        courseCode: "CMSC 128",
        section: "AB",
        type: "LEC",
        schedule: ["MW 07:00AM-08:00AM"],
        roomCode: "ICS MH",
        directions: null,
        courseTitle: "Software Engineering",
        roomId: 1,
        termId: 1252,
      },
    ]);
    mapViewStore.highlightMyBuildings = false;
    const sheet = await openSheet();
    const myClasses = within(sheet).getByRole("switch", {
      name: "My classes",
    }) as HTMLButtonElement;
    expect(myClasses.disabled).toBe(false);
    myClasses.click();
    expect(mapViewStore.highlightMyBuildings).toBe(true);
  });

  test("pins are a radio group, not a cycling button", async () => {
    const sheet = await openSheet();
    const pins = within(sheet).getByRole("radiogroup", { name: "Pins" });
    within(pins).getByRole("radio", { name: "Events only" }).click();
    expect(mapViewStore.eventsOnly).toBe(true);
    within(pins).getByRole("radio", { name: "All" }).click();
    expect(mapViewStore.eventsOnly).toBe(false);
  });

  test("camera details stay hidden without the developer flag", async () => {
    const sheet = await openSheet();
    expect(
      within(sheet).queryByRole("switch", { name: "Camera details" }),
    ).toBeNull();
  });

  test("the legend is a static key with no toggles", async () => {
    const sheet = await openSheet();
    const legend = sheet.querySelector("#map-icon-legend");
    expect(legend).not.toBeNull();
    expect(legend?.querySelectorAll("button")).toHaveLength(0);
  });

  test("walking time switch activates the tool and hands back the map", async () => {
    const sheet = await openSheet();
    within(sheet).getByRole("switch", { name: "Walking time" }).click();
    expect(travelTimeStore.active).toBe(true);
    // Panel closes so the next tap lands on the map.
    expect(mapToolsStore.open).toBe(false);
  });

  test("toggling an active tool turns it off", async () => {
    travelTimeStore.enable();
    const sheet = await openSheet();
    const toggle = within(sheet).getByRole("switch", { name: "Walking time" });
    expect(toggle).toHaveAttribute("aria-checked", "true");
    toggle.click();
    expect(travelTimeStore.active).toBe(false);
  });

  test("measuring keeps walking time once it has a start point", async () => {
    travelTimeStore.enable();
    travelTimeStore.setOrigin(14.165, 121.242);
    const sheet = await openSheet();
    within(sheet).getByRole("switch", { name: "Measure route" }).click();
    expect(measureRouteStore.active).toBe(true);
    expect(travelTimeStore.active).toBe(true);
    expect(toastStore.message).toBeNull();
  });

  test("measuring turns off a walking time still waiting for its start point", async () => {
    travelTimeStore.enable();
    const sheet = await openSheet();
    within(sheet).getByRole("switch", { name: "Measure route" }).click();
    expect(measureRouteStore.active).toBe(true);
    expect(travelTimeStore.active).toBe(false);
    expect(toastStore.message).toBe("Walking time turned off while measuring");
  });

  test("Schedule route and Route my day live in Today, not in Layers", async () => {
    const sheet = await openSheet();
    expect(within(sheet).queryByText("Schedule route")).toBeNull();
    expect(within(sheet).queryByText("Route my day")).toBeNull();
  });

  test("map tool subtitles use plain language without slashes", async () => {
    const sheet = await openSheet();
    expect(
      within(sheet).getByText(
        "Shows how many minutes it takes to walk from a point you tap",
      ),
    ).toBeInTheDocument();
    expect(
      within(sheet).getByText(
        "Tap the map to add stops and see walking, cycling and driving times",
      ),
    ).toBeInTheDocument();
    expect(sheet.textContent ?? "").not.toMatch(/ \/ /);
    expect(mapToolsStore.open).toBe(true);
  });
});
