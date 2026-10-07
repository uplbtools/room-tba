import { render, screen } from "@testing-library/svelte";
import { afterEach, describe, expect, test } from "vitest";
import JeepneyRouteModal from "./JeepneyRouteModal.svelte";
import { jeepneyStore, transitStore } from "@lib/store.svelte";
import {
  BUS_FARE_NOTE,
  JEEPNEY_ROUTES,
  JEEPNEY_RIDING_NOTES,
} from "@constants/jeepney-routes";
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
    // Kaliwa/Kanan lists Olivarez Plaza as stop 1 and again as stop 20.
    expect(
      screen.getByText(new RegExp(`\\(${route.stops.length - 1}, loop\\)`)),
    ).toBeVisible();
    expect(screen.getByText(/back to the start/)).toBeInTheDocument();
    expectNoHorizontalOverflow(container);
  });

  function withRoute(
    route: (typeof transitStore.routes)[number],
    run: () => void,
  ) {
    const original = transitStore.routes;
    transitStore.routes = [...original, route];
    try {
      run();
    } finally {
      transitStore.routes = original;
    }
  }

  const busStops = [
    { name: "Los Baños", description: "", lat: 14.166, lon: 121.24 },
    { name: "Buendia", description: "", lat: 14.554, lon: 120.997 },
  ];

  test("a bus route says bus, with bus fares and no campus jeep tips", () => {
    withRoute(
      {
        id: "lb-to-buendia",
        name: "Los Baños → Buendia (LRT Gil Puyat)",
        description: "Provincial bus.",
        color: "#2563eb",
        fare: { regular: 165, discounted: 132 },
        stops: busStops,
      },
      () => {
        jeepneyStore.modalRouteId = "lb-to-buendia";
        render(JeepneyRouteModal);

        expect(
          screen.getByRole("heading", {
            name: /Buendia \(LRT Gil Puyat\) bus route/,
          }),
        ).toBeVisible();
        expect(screen.getByText(BUS_FARE_NOTE)).toBeVisible();
        expect(screen.getByText("₱165")).toBeVisible();
        expect(screen.queryByText(JEEPNEY_RIDING_NOTES[2]!)).toBeNull();
      },
    );
  });

  test("the DLTB UP Diliman bus links to DLTB tickets instead of a fare", () => {
    withRoute(
      {
        id: "uplb-to-upd",
        name: "UPLB → UP Diliman (DLTB Commuter Bus)",
        description: "Direct DLTB commuter bus.",
        color: "#7c3aed",
        fare: { regular: 165, discounted: 132 },
        stops: busStops,
      },
      () => {
        jeepneyStore.modalRouteId = "uplb-to-upd";
        render(JeepneyRouteModal);

        expect(
          screen.getByRole("link", { name: "DLTB website" }),
        ).toHaveAttribute("href", "https://dltbbus.com.ph/");
        expect(screen.queryByText("₱165")).toBeNull();
        expect(screen.queryByText(BUS_FARE_NOTE)).toBeNull();
      },
    );
  });

  test("clicking a stop selects its route on the map, then the stop", () => {
    const route = JEEPNEY_ROUTES[0];
    jeepneyStore.modalRouteId = route.id;
    jeepneyStore.selectedRouteId = null;
    render(JeepneyRouteModal);

    const stopIndex = 2;
    screen
      .getByRole("button", { name: new RegExp(route.stops[stopIndex].name) })
      .click();

    // Order matters: openStop bails when no route is selected, and selecting a
    // different route clears the stop.
    expect(jeepneyStore.selectedRouteId).toBe(route.id);
    expect(jeepneyStore.selectedStopIndex).toBe(stopIndex);
  });

  test("the side panel copy opens the stop without re-selecting the route", () => {
    const route = JEEPNEY_ROUTES[0];
    jeepneyStore.openRouteOnMap(route.id);
    render(JeepneyRouteModal, { props: { routeId: route.id } });

    screen
      .getByRole("button", { name: new RegExp(route.stops[1].name) })
      .click();

    expect(jeepneyStore.selectedStopIndex).toBe(1);
  });

  test("the side panel copy closes with the X button or Escape", () => {
    const route = JEEPNEY_ROUTES[0];
    let closed = 0;
    render(JeepneyRouteModal, {
      props: { routeId: route.id, onback: () => {}, onclose: () => closed++ },
    });

    screen
      .getByRole("button", { name: /close route and return to the map/i })
      .click();
    expect(closed).toBe(1);

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(closed).toBe(2);
  });

  test("the modal copy has no close button and ignores Escape", () => {
    const route = JEEPNEY_ROUTES[0];
    jeepneyStore.modalRouteId = route.id;
    render(JeepneyRouteModal);
    expect(
      screen.queryByRole("button", { name: /close route and return/i }),
    ).toBeNull();
  });

  test("shows an empty state when the route id is unknown", () => {
    jeepneyStore.modalRouteId = "does-not-exist";
    render(JeepneyRouteModal);
    expect(screen.getByText(/no longer available/i)).toBeVisible();
  });
});
