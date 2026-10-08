import { render, screen, within } from "@testing-library/svelte";
import { flushSync } from "svelte";
import { beforeEach, describe, expect, test } from "vitest";
import { mapToolsStore, sidePanelStore, trailStore } from "@lib/store.svelte";
import { getTrailStops } from "@lib/makiling-trail";
import TrailControl from "../TrailControl.svelte";
import TrailPanel from "./TrailPanel.svelte";

describe("TrailPanel", () => {
  beforeEach(() => {
    trailStore.disable();
    sidePanelStore.closePanel();
  });

  test("overview leads with the trail summary", () => {
    trailStore.openSheet();
    render(TrailPanel);
    expect(
      screen.getByRole("heading", { name: "Makiling Trail" }),
    ).toBeInTheDocument();
    const facts = screen.getByText("Route type").closest("dl") as HTMLElement;
    expect(within(facts).getByText("Out and back")).toBeInTheDocument();
    expect(within(facts).getByText("Very strenuous")).toBeInTheDocument();
    expect(within(facts).getByText(/^17\.\d km$/)).toBeInTheDocument();
    expect(within(facts).getByText(/^1,0\d\d m$/)).toBeInTheDocument();
    expect(within(facts).getByText(/^5 h/)).toBeInTheDocument();
  });

  test("profile chart describes itself and labels both axes", () => {
    trailStore.openSheet();
    render(TrailPanel);
    const chart = screen.getByRole("img", {
      name: /Elevation profile from Station 1/,
    });
    expect(chart).toHaveAccessibleName(/Agila Base: 5\.27 km/);
    expect(
      screen.getByText("Distance from Station 1 (km)"),
    ).toBeInTheDocument();
    expect(screen.getByText("Elevation (m)")).toBeInTheDocument();
  });

  test("one Before you go section with consistent names", () => {
    trailStore.openSheet();
    render(TrailPanel);
    expect(
      screen.getAllByRole("heading", { name: "Before you go" }),
    ).toHaveLength(1);
    expect(
      screen.getByText(/MCME registration area at Station 1 \(trailhead\)/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/reach Agila Base \(Station 11\) by 09:00/),
    ).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/Wilderness Zone start/);
    expect(document.body.textContent).not.toContain("\u00b7");
  });

  test("every stop is a row in the sheet's own scroll", () => {
    trailStore.openSheet();
    render(TrailPanel);
    const section = screen
      .getByRole("heading", { name: "Stations" })
      .closest("section") as HTMLElement;
    const rows = within(section).getAllByRole("button");
    expect(rows).toHaveLength(getTrailStops().length);
    expect(rows[0]).toHaveTextContent("Station 1 (trailhead)");
    expect(rows[0]).toHaveTextContent("0.00 km from Station 1");
  });

  test("a row opens the stop and flies to it; the breadcrumb goes back", () => {
    trailStore.openSheet();
    render(TrailPanel);
    const before = trailStore.flyNonce;
    screen.getByRole("button", { name: /Agila Base/ }).click();
    flushSync();
    expect(trailStore.selectedStopId).toBe("agila-base");
    expect(trailStore.flyNonce).toBe(before + 1);
    expect(
      screen.getByRole("heading", { name: "Agila Base" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Station 11")).toBeInTheDocument();
    expect(screen.getByText(/last reliable water/)).toBeInTheDocument();
    expect(screen.getByText("5.27 km")).toBeInTheDocument();

    screen.getByRole("button", { name: /Next/ }).click();
    flushSync();
    expect(trailStore.selectedStopId).toBe("punodaan");

    screen.getByRole("button", { name: "Makiling Trail" }).click();
    flushSync();
    expect(trailStore.selectedStopId).toBeNull();
    expect(
      screen.getByRole("heading", { name: "Stations" }),
    ).toBeInTheDocument();
  });

  test("Close closes the sheet but keeps the trail drawn", () => {
    trailStore.openSheet("peak-2");
    render(TrailPanel);
    expect(
      screen.getByRole("button", { name: "Place details" }),
    ).toBeInTheDocument();
    screen.getByRole("button", { name: "Close trail" }).click();
    flushSync();
    expect(trailStore.sheetOpen).toBe(false);
    expect(trailStore.enabled).toBe(true);
  });
});

describe("TrailControl", () => {
  beforeEach(() => {
    trailStore.disable();
    mapToolsStore.close();
  });

  test("is a switch that remembers its state", () => {
    render(TrailControl);
    const toggle = screen.getByRole("switch", { name: /Makiling Trail/ });
    expect(toggle).toHaveAttribute("aria-checked", "false");
    toggle.click();
    flushSync();
    expect(trailStore.enabled).toBe(true);
    expect(localStorage.getItem("makiling-trail-layer")).toBe("true");
    expect(toggle).toHaveAttribute("aria-checked", "true");
  });

  test("Frame trail on map closes Layers first, then asks for a frame", () => {
    trailStore.enable();
    mapToolsStore.toggle();
    render(TrailControl);
    const before = trailStore.frameNonce;
    screen.getByRole("button", { name: "Frame trail on map" }).click();
    expect(mapToolsStore.open).toBe(false);
    expect(trailStore.frameNonce).toBe(before + 1);
  });
});
