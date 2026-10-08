import { render, screen } from "@testing-library/svelte";
import { tick } from "svelte";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { transitStopKey } from "@lib/transit-reports";
import JeepneyRouteModal from "./JeepneyRouteModal.svelte";
import { jeepneyStore, transitStore } from "@lib/store.svelte";
import {
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

  test("a bus route says bus, quotes no unverified fare and no campus jeep tips", () => {
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
        expect(screen.getByText(/Fare not verified yet/)).toBeVisible();
        expect(screen.queryByText("₱165")).toBeNull();
        expect(screen.queryByText(JEEPNEY_RIDING_NOTES[2]!)).toBeNull();
      },
    );
  });

  test("San Pablo jeep says to board at the Junction and quotes only the minimum", () => {
    withRoute(
      {
        id: "lb-to-san-pablo",
        name: "Los Baños → San Pablo",
        description: "Jeepney toward San Pablo City.",
        color: "#EF6C00",
        fare: { regular: 50, discounted: 40 },
        stops: busStops,
      },
      () => {
        jeepneyStore.modalRouteId = "lb-to-san-pablo";
        render(JeepneyRouteModal);

        expect(screen.getByText(/Board at the Junction/)).toBeVisible();
        expect(screen.getByText(/Minimum fare/)).toBeVisible();
        expect(screen.queryByText("₱50")).toBeNull();
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
        expect(screen.queryByText(/Fare not verified yet/)).toBeNull();
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

  test("the Kaliwa / Kanan toggle reverses the stop order", async () => {
    const route = JEEPNEY_ROUTES[0]!;
    jeepneyStore.modalRouteId = route.id;
    const { container } = render(JeepneyRouteModal);

    const kanan = screen.getByRole("button", { name: "Kanan" });
    const kaliwa = screen.getByRole("button", { name: "Kaliwa" });
    expect(kanan).toHaveAttribute("aria-pressed", "true");
    const secondStop = () =>
      container.querySelectorAll(".jeepney-modal__stops li")[1]?.textContent;
    expect(secondStop()).toContain("Robinsons Town Mall");

    kaliwa.click();
    await tick();
    expect(kaliwa).toHaveAttribute("aria-pressed", "true");
    expect(transitStore.isReversed(route.id)).toBe(true);
    expect(secondStop()).toContain("Carabao Park / Landbank");
    transitStore.setReversed(route.id, false);
  });

  test("one-way routes have no direction toggle", () => {
    jeepneyStore.modalRouteId = "forestry";
    render(JeepneyRouteModal);
    expect(screen.queryByRole("group", { name: "Direction" })).toBeNull();
  });

  test("shows published hours and says when a schedule is not published", () => {
    jeepneyStore.modalRouteId = "uplb-to-buendia";
    const { unmount } = render(JeepneyRouteModal);
    expect(screen.getByText(/Daily, 5:00 AM, 1 trip a day/)).toBeVisible();
    unmount();

    jeepneyStore.modalRouteId = "kaliwa-kanan";
    render(JeepneyRouteModal);
    expect(screen.getByText(/Schedule not published/)).toBeVisible();
  });

  test("Suggest a stop and Copy link share one footer row", async () => {
    jeepneyStore.modalRouteId = "kaliwa-kanan";
    const { container } = render(JeepneyRouteModal);

    const footer = container.querySelector(".jeepney-modal__actions");
    expect(footer).not.toBeNull();
    const suggest = screen.getByRole("button", { name: "Suggest a stop" });
    expect(footer?.contains(suggest)).toBe(true);
    expect(
      footer?.contains(screen.getByRole("button", { name: /copy link/i })),
    ).toBe(true);
    // Only the footer's toggle: the editor below the stops has none of its own.
    expect(
      screen.getAllByRole("button", { name: /suggest a stop/i }),
    ).toHaveLength(1);

    suggest.click();
    await tick();
    expect(
      container.querySelector(".jeepney-modal__scroll .transit-stop-editor"),
    ).not.toBeNull();
    expect(screen.getByLabelText("Stop name")).toBeInTheDocument();
  });

  test("shows an empty state when the route id is unknown", () => {
    jeepneyStore.modalRouteId = "does-not-exist";
    render(JeepneyRouteModal);
    expect(screen.getByText(/no longer available/i)).toBeVisible();
  });
});

describe("JeepneyRouteModal jeep reports line", () => {
  const route = JEEPNEY_ROUTES.find((r) => r.id === "kaliwa-kanan")!;
  const stop = route.stops[3]!;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.UTC(2026, 9, 8, 2, 3));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  test("shows the newest rider report with its stop", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          now: new Date().toISOString(),
          reports: [
            {
              routeId: route.id,
              stopKey: transitStopKey(stop),
              direction: "forward",
              full: false,
              at: new Date(Date.now() - 5 * 60_000).toISOString(),
            },
          ],
        }),
      ),
    );
    jeepneyStore.modalRouteId = route.id;
    render(JeepneyRouteModal);

    expect(
      await screen.findByText(
        `Last jeep reported 5 min ago at ${stop.name}`,
        {},
        { timeout: 5000 },
      ),
    ).toBeVisible();
  });

  test("says nothing about reports when they cannot load", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);
    jeepneyStore.modalRouteId = route.id;
    render(JeepneyRouteModal);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await tick();

    expect(screen.queryByText(/reported|No recent reports/)).toBeNull();
  });
});
