import { render, screen } from "@testing-library/svelte";
import { afterEach, describe, expect, test } from "vitest";
import JeepneyRouteModal from "./JeepneyRouteModal.svelte";
import { jeepneyStore } from "@lib/store.svelte";
import { JEEPNEY_ROUTES } from "@constants/jeepney-routes";
import {
  expectNoHorizontalOverflow,
  mountAtWidth,
} from "@test/layout-assertions";

afterEach(() => {
  jeepneyStore.modalRouteId = null;
});

describe("JeepneyRouteModal", () => {
  test("renders the selected route with fare and stops at 320px", () => {
    const route = JEEPNEY_ROUTES[0];
    jeepneyStore.modalRouteId = route.id;
    mountAtWidth(320);
    const { container } = render(JeepneyRouteModal);

    expect(
      screen.getByRole("heading", { name: new RegExp(route.name, "i") }),
    ).toBeVisible();
    expect(screen.getByText(`₱${route.fare.regular}`)).toBeVisible();
    expect(
      screen.getByText(new RegExp(`\\(${route.stops.length}\\)`)),
    ).toBeVisible();
    expectNoHorizontalOverflow(container);
  });

  test("shows an empty state when the route id is unknown", () => {
    jeepneyStore.modalRouteId = "does-not-exist";
    render(JeepneyRouteModal);
    expect(screen.getByText(/no longer available/i)).toBeVisible();
  });
});
