import { render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, test } from "vitest";
import MapViewControls from "./MapViewControls.svelte";
import { mapViewStore, plannerStore } from "@lib/store.svelte";
import { mountAtWidth } from "@test/layout-assertions";

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

    // Camera details is a developer tool (?debug=1), not a user setting.
    expect(screen.queryByRole("switch", { name: "Camera details" })).toBeNull();

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
