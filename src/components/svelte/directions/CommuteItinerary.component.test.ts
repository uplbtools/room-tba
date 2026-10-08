import { render, screen } from "@testing-library/svelte";
import { describe, expect, test, vi } from "vitest";
import CommuteItinerary from "./CommuteItinerary.svelte";
import type { Journey } from "@lib/travel-graph/journey";
import {
  expectNoHorizontalOverflow,
  mountAtWidth,
} from "@test/layout-assertions";

const journey: Journey = {
  id: "kaliwa-kanan (reverse)",
  kind: "transit",
  seconds: 1500,
  meters: 2400,
  walkMeters: 600,
  fare: { regular: 14, discounted: 12 },
  geometrySource: "walk-graph",
  legs: [
    {
      kind: "walk",
      seconds: 240,
      meters: 300,
      coordinates: [
        [121.24, 14.16],
        [121.241, 14.161],
      ],
    },
    {
      kind: "ride",
      routeId: "kaliwa-kanan",
      routeName: "Kaliwa / Kanan",
      color: "#dc2626",
      fare: { regular: 14, discounted: 12 },
      boardStopName: "Carabao Park / Landbank",
      alightStopName: "Headquarters",
      stopCount: 4,
      stopNames: [
        "Carabao Park / Landbank",
        "Makiling School",
        "St. Therese / Math Building",
        "Headquarters",
      ],
      directionLabel: "Kaliwa",
      waitSeconds: 300,
      seconds: 720,
      meters: 1500,
      coordinates: [
        [121.241, 14.161],
        [121.245, 14.165],
      ],
    },
    {
      kind: "walk",
      seconds: 300,
      meters: 300,
      coordinates: [
        [121.245, 14.165],
        [121.246, 14.166],
      ],
    },
  ],
};

describe("CommuteItinerary", () => {
  test("reads walk, board, ride, get off, walk at 320px", () => {
    mountAtWidth(320);
    const { container } = render(CommuteItinerary, { props: { journey } });

    const steps = [...container.querySelectorAll(".itinerary > li")].map((li) =>
      li.textContent?.replace(/\s+/g, " ").trim(),
    );
    expect(steps).toEqual([
      "Walk 4 min · 300 m",
      "Board Kaliwa / Kanan (Kaliwa) at Carabao Park / Landbank",
      "Ride 3 stops · 7 min Makiling SchoolSt. Therese / Math Building",
      "Get off at Headquarters",
      "Walk 5 min · 300 m",
    ]);
    expectNoHorizontalOverflow(container);
  });

  test("intermediate stops stay folded until asked for", () => {
    const { container } = render(CommuteItinerary, { props: { journey } });
    const details = container.querySelector("details");
    expect(details?.open).toBe(false);
    expect(screen.getByText("Makiling School")).not.toBeVisible();
  });

  test("tapping a stop shows it on the map", () => {
    const onstop = vi.fn();
    render(CommuteItinerary, { props: { journey, onstop } });

    screen.getByRole("button", { name: "Carabao Park / Landbank" }).click();
    expect(onstop).toHaveBeenLastCalledWith([121.241, 14.161]);
    screen.getByRole("button", { name: "Headquarters" }).click();
    expect(onstop).toHaveBeenLastCalledWith([121.245, 14.165]);
  });

  test("skips a zero-length walk when boarding at the start", () => {
    const { container } = render(CommuteItinerary, {
      props: {
        journey: {
          ...journey,
          legs: [
            { ...journey.legs[0]!, meters: 0, seconds: 0 },
            ...journey.legs.slice(1),
          ],
        },
      },
    });
    expect(
      container.querySelectorAll(".itinerary > li")[0]?.textContent,
    ).toContain("Board");
  });
});
