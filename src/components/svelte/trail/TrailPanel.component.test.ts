import { render, screen, within } from "@testing-library/svelte";
import { flushSync } from "svelte";
import { beforeEach, describe, expect, test } from "vitest";
import { MAKILING_TRAIL_ID, SIPIT_TRAIL_ID } from "@constants/makiling-trail";
import { mapToolsStore, sidePanelStore, trailStore } from "@lib/store.svelte";
import { getTrailStops } from "@lib/makiling-trail";
import TrailControl from "../TrailControl.svelte";
import TrailPanel from "./TrailPanel.svelte";

describe("TrailPanel", () => {
  beforeEach(() => {
    trailStore.disable();
    trailStore.selectTrail(MAKILING_TRAIL_ID);
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
      screen.getByText(/Monitoring Station 1 \(College of Forestry\)/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/cut-off to start for Peak 2 is 9 AM/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/logs out at Station 1 by 4 PM/),
    ).toBeInTheDocument();
    expect(screen.getByText(/PHP 10 per person/)).toBeInTheDocument();
    expect(screen.getByText(/PHP 500 per group per night/)).toBeInTheDocument();
    expect(screen.getByText(/0908 988 1778/)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/guide/);
    expect(document.body.textContent).not.toContain("06:00");
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

describe("TrailPanel trail picker", () => {
  beforeEach(() => {
    trailStore.disable();
    trailStore.selectTrail(MAKILING_TRAIL_ID);
    sidePanelStore.closePanel();
  });

  test("two buttons switch the trail and ask for a frame", () => {
    trailStore.openSheet();
    render(TrailPanel);
    const uplb = screen.getByRole("button", { name: "UPLB trail" });
    const sipit = screen.getByRole("button", { name: "Sipit trail" });
    expect(uplb).toHaveAttribute("aria-pressed", "true");
    expect(sipit).toHaveAttribute("aria-pressed", "false");
    const before = trailStore.frameNonce;
    sipit.click();
    flushSync();
    expect(trailStore.trailId).toBe(SIPIT_TRAIL_ID);
    expect(trailStore.frameNonce).toBe(before + 1);
    expect(sipit).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("heading", { name: "Sipit Trail" }),
    ).toBeInTheDocument();
  });

  test("the Sipit overview says it isn't open and points to Facebook", () => {
    trailStore.openSheet(null, SIPIT_TRAIL_ID);
    render(TrailPanel);
    expect(screen.getByText(/isn't open to visitors yet/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "facebook.com/makilingcenter" }),
    ).toHaveAttribute("href", "https://www.facebook.com/makilingcenter");
    const facts = screen.getByText("Route type").closest("dl") as HTMLElement;
    expect(within(facts).getByText("One way")).toBeInTheDocument();
    expect(within(facts).getByText("5 to 8 h")).toBeInTheDocument();
    expect(within(facts).getByText(/^5\.\d\d km$/)).toBeInTheDocument();
    expect(screen.queryByText("Difficulty")).toBeNull();
    expect(screen.getAllByText(/older guides/i).length).toBeGreaterThan(0);
    expect(document.body.textContent).not.toMatch(/PHP 10 per person/);
    expect(
      screen.getByRole("img", { name: /Elevation profile from the trailhead/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Stops" })).toBeInTheDocument();
  });

  test("a Sipit stop shows the notice and measures from the trailhead", () => {
    trailStore.openSheet("sipit-junction", SIPIT_TRAIL_ID);
    render(TrailPanel);
    expect(trailStore.trailId).toBe(SIPIT_TRAIL_ID);
    expect(
      screen.getByRole("heading", {
        name: "Junction with the old Makiling Trail",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("From the trailhead")).toBeInTheDocument();
    expect(screen.getByText(/isn't open to visitors yet/)).toBeInTheDocument();
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
