import { render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, test } from "vitest";
import { mapToolsStore, travelTimeStore } from "@lib/store.svelte";
import { mountAtWidth } from "@test/layout-assertions";
import MapToolsFlyout from "./MapToolsFlyout.svelte";

describe("MapToolsFlyout", () => {
  beforeEach(() => {
    mapToolsStore.close();
    travelTimeStore.disable();
  });

  test("chip opens the tools panel", async () => {
    mountAtWidth(320);
    render(MapToolsFlyout);
    const chip = screen.getByRole("button", { name: "Map tools" });
    chip.click();
    expect(mapToolsStore.open).toBe(true);
    expect(
      await screen.findByRole("dialog", { name: "Map tools" }),
    ).toBeInTheDocument();
  });

  test("travel time toggle activates the tool and hands back the map", async () => {
    mapToolsStore.toggle();
    render(MapToolsFlyout);
    const toggle = await screen.findByRole("button", {
      name: /travel time/i,
    });
    toggle.click();
    expect(travelTimeStore.active).toBe(true);
    // Panel closes so the next tap lands on the map.
    expect(mapToolsStore.open).toBe(false);
  });

  test("toggling an active tool turns it off", async () => {
    travelTimeStore.enable();
    mapToolsStore.toggle();
    render(MapToolsFlyout);
    const toggle = await screen.findByRole("button", {
      name: /travel time/i,
    });
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    toggle.click();
    expect(travelTimeStore.active).toBe(false);
  });
});
