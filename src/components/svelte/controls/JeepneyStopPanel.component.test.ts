import { render, screen } from "@testing-library/svelte";
import { tick } from "svelte";
import { afterEach, describe, expect, test } from "vitest";
import JeepneyStopPanel from "./JeepneyStopPanel.svelte";
import { jeepneyStore, transitStore } from "@lib/store.svelte";
import { JEEPNEY_ROUTES } from "@constants/jeepney-routes";
import {
  expectNoHorizontalOverflow,
  mountAtWidth,
} from "@test/layout-assertions";

const kaliwaKanan = JEEPNEY_ROUTES.find((r) => r.id === "kaliwa-kanan")!;
const libraryIndex = kaliwaKanan.stops.findIndex(
  (s) => s.name === "Main Library",
);

afterEach(() => {
  transitStore.setReversed("kaliwa-kanan", false);
  jeepneyStore.clearRoute();
});

describe("JeepneyStopPanel", () => {
  test("lists every route serving the stop, with its direction", () => {
    jeepneyStore.openRouteOnMap("kaliwa-kanan");
    jeepneyStore.openStop(libraryIndex);
    mountAtWidth(320);
    const { container } = render(JeepneyStopPanel);

    const current = screen.getByRole("link", { name: /Kaliwa \/ Kanan/ });
    expect(current).toHaveAttribute("aria-current", "page");
    expect(current).toHaveTextContent("Kanan / Kaliwa");
    const loop = screen.getByRole("link", { name: /SNODLOB/ });
    expect(loop).toHaveAttribute("href", "/transit/snodlob/");
    expect(loop).toHaveTextContent("One-way loop");
    expectNoHorizontalOverflow(container);
  });

  test("a route chip opens that route", async () => {
    jeepneyStore.openRouteOnMap("kaliwa-kanan");
    jeepneyStore.openStop(libraryIndex);
    render(JeepneyStopPanel);

    screen.getByRole("link", { name: /SNODLOB/ }).click();
    await tick();
    expect(jeepneyStore.selectedRouteId).toBe("snodlob");
    expect(jeepneyStore.selectedStopIndex).toBeNull();
  });

  test("follows the picked direction", () => {
    transitStore.setReversed("kaliwa-kanan", true);
    jeepneyStore.openRouteOnMap("kaliwa-kanan");
    jeepneyStore.openStop(1);
    render(JeepneyStopPanel);

    expect(
      screen.getByRole("heading", { name: "Carabao Park / Landbank" }),
    ).toBeVisible();
    expect(screen.getByText(/Stop 2 of 19 on the loop, Kaliwa/)).toBeVisible();
  });
});
