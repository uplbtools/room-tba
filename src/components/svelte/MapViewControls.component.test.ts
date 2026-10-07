import { render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, test } from "vitest";
import MapViewControls from "./MapViewControls.svelte";
import { mapViewStore, plannerStore, termStore } from "@lib/store.svelte";
import { mountAtWidth } from "@test/layout-assertions";

describe("MapViewControls My classes toggle", () => {
  beforeEach(() => {
    localStorage.clear();
    plannerStore.plans = [];
    plannerStore.activePlanIdByTerm = {};
    mapViewStore.showAll();
  });

  test("disabled with a hint when the planner has no classes at 320px", () => {
    mountAtWidth(320);
    render(MapViewControls, { props: { embedded: true, variant: "modes" } });

    const toggle = screen.getByRole("button", {
      name: /Add classes in the Planner/,
    }) as HTMLButtonElement;
    expect(toggle.disabled).toBe(true);
    expect(screen.getByText("Add classes in the Planner first.")).toBeTruthy();
  });

  test("enabled and flips highlight mode when a plan has classes", async () => {
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

    mountAtWidth(320);
    render(MapViewControls, { props: { embedded: true, variant: "modes" } });

    const toggle = screen.getByRole("button", {
      name: /Highlight the buildings/,
    }) as HTMLButtonElement;
    expect(toggle.disabled).toBe(false);

    toggle.click();
    expect(mapViewStore.highlightMyBuildings).toBe(true);
  });
});

describe("MapViewControls camera details toggle", () => {
  beforeEach(() => {
    localStorage.clear();
    mapViewStore.cameraDebug = false;
  });

  test("row toggles the camera debug flag and tracks aria-pressed", async () => {
    render(MapViewControls, { props: { embedded: true, variant: "modes" } });

    const toggle = screen.getByRole("button", {
      name: /show a live camera readout/i,
    });
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    toggle.click();
    expect(mapViewStore.cameraDebug).toBe(true);
  });
});

describe("MapViewControls settings rows", () => {
  beforeEach(() => {
    localStorage.clear();
    plannerStore.plans = [];
    plannerStore.activePlanIdByTerm = {};
    mapViewStore.showAll();
    mapViewStore.cameraDebug = false;
  });

  test("on/off settings are switches and choices are segments at 320px", () => {
    mountAtWidth(320);
    render(MapViewControls, { props: { embedded: true, variant: "settings" } });

    const camera = screen.getByRole("switch", { name: "Camera details" });
    expect(camera.getAttribute("aria-checked")).toBe("false");
    camera.click();
    expect(mapViewStore.cameraDebug).toBe(true);

    const myClasses = screen.getByRole("switch", {
      name: "Highlight my class buildings",
    }) as HTMLButtonElement;
    expect(myClasses.disabled).toBe(true);

    const pins = screen.getByRole("group", { name: "Pins" });
    const events = screen.getByRole("button", { name: "Events only" });
    expect(pins.contains(events)).toBe(true);
    events.click();
    expect(mapViewStore.eventsOnly).toBe(true);

    expect(screen.getByRole("group", { name: "Map style" })).toBeTruthy();
  });
});
