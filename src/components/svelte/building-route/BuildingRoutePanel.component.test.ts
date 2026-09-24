import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  expectNoHorizontalOverflow,
  mountAtWidth,
} from "@test/layout-assertions";
import { buildingRouteStore } from "@lib/stores/building-route-store.svelte";
import BuildingRoutePanel from "./BuildingRoutePanel.svelte";

const { buildingRows } = vi.hoisted(() => ({
  buildingRows: [
    {
      id: 31,
      buildingName: "New Math Building",
      lat: 14.1646268,
      lon: 121.2436644,
    },
    {
      id: 35,
      buildingName: "Physical Sciences Building",
      lat: 14.1643788,
      lon: 121.2418036,
    },
  ],
}));

vi.mock("@lib/context", () => ({
  getAppData: () => () => ({
    buildings: buildingRows,
    colleges: [],
    divisions: [],
    dorms: [],
    events: [],
    organizations: [],
    places: [],
    totalRooms: 0,
    directionCount: 0,
    loaded: true,
  }),
}));

describe("BuildingRoutePanel", () => {
  beforeEach(() => buildingRouteStore.close());

  test.each([320, 768])("fits the two-building picker at %ipx", (width) => {
    mountAtWidth(width);
    buildingRouteStore.open();
    const { container } = render(BuildingRoutePanel);
    expect(screen.getByLabelText("From building")).toBeVisible();
    expect(screen.getByLabelText("To building")).toBeVisible();
    expectNoHorizontalOverflow(container as HTMLElement);
  });

  test("search suggestions contain buildings only", async () => {
    buildingRouteStore.open();
    render(BuildingRoutePanel);
    const from = screen.getByLabelText("From building");
    await fireEvent.input(from, { target: { value: "math" } });
    const option = screen.getByRole("option", { name: "New Math Building" });
    expect(option).toBeVisible();
    // aria-activedescendant keeps DOM focus on the editable combobox. Options
    // must not become extra Tab stops.
    expect(option).toHaveAttribute("tabindex", "-1");
    expect(screen.queryByText("room")).toBeNull();
  });

  test("restores selected building names when the panel remounts", () => {
    buildingRouteStore.open();
    buildingRouteStore.origin = {
      id: 31,
      buildingName: "New Math Building",
      lat: 14.1646268,
      lon: 121.2436644,
    };
    buildingRouteStore.destination = {
      id: 35,
      buildingName: "Physical Sciences Building",
      lat: 14.1643788,
      lon: 121.2418036,
    };

    render(BuildingRoutePanel);
    expect(screen.getByLabelText("From building")).toHaveValue(
      "New Math Building",
    );
    expect(screen.getByLabelText("To building")).toHaveValue(
      "Physical Sciences Building",
    );
  });

  test("keyboard selection chooses a building without requiring a pointer", async () => {
    buildingRouteStore.open();
    render(BuildingRoutePanel);
    const from = screen.getByLabelText("From building");
    await fireEvent.input(from, { target: { value: "math" } });
    await fireEvent.keyDown(from, { key: "Enter" });

    expect(buildingRouteStore.origin?.id).toBe(31);
    expect(from).toHaveValue("New Math Building");
    await waitFor(() =>
      expect(screen.getByLabelText("To building")).toHaveFocus(),
    );
  });

  test("Escape dismisses suggestions without clearing the router session", async () => {
    buildingRouteStore.open();
    render(BuildingRoutePanel);
    const from = screen.getByLabelText("From building");
    from.focus();
    await fireEvent.input(from, { target: { value: "math" } });
    expect(screen.getByRole("listbox")).toBeVisible();

    await fireEvent.keyDown(from, { key: "Escape" });

    expect(screen.queryByRole("listbox")).toBeNull();
    expect(buildingRouteStore.active).toBe(true);
    expect(from).toHaveFocus();

    // Reopening with ArrowDown should start at the first result rather than
    // skipping it because index 0 happened to be retained while closed.
    await fireEvent.keyDown(from, { key: "ArrowDown" });
    expect(screen.getByRole("listbox")).toBeVisible();
    expect(from).toHaveAttribute(
      "aria-activedescendant",
      "building-route-origin-0",
    );
  });

  test("announces route calculation as a busy status", () => {
    buildingRouteStore.open();
    buildingRouteStore.phase = "planning";
    render(BuildingRoutePanel);

    expect(
      screen.getByRole("region", { name: "Walk between buildings" }),
    ).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Finding walking route…")).toBeVisible();
  });

  test("empty suggestions stay safe under arrow-key navigation", async () => {
    buildingRouteStore.open();
    render(BuildingRoutePanel);
    const from = screen.getByLabelText("From building");
    await fireEvent.input(from, { target: { value: "not-a-building" } });
    await fireEvent.keyDown(from, { key: "ArrowDown" });

    expect(screen.getByText("No matching buildings.")).toBeVisible();
    expect(from.getAttribute("aria-activedescendant")).not.toBe(
      "building-route-origin--1",
    );
  });

  test("shows connector-inclusive ETA and distance from the ready result", () => {
    buildingRouteStore.open();
    buildingRouteStore.origin = {
      id: 31,
      buildingName: "New Math Building",
      lat: 14.1646268,
      lon: 121.2436644,
    };
    buildingRouteStore.destination = {
      id: 35,
      buildingName: "Physical Sciences Building",
      lat: 14.1643788,
      lon: 121.2418036,
    };
    buildingRouteStore.phase = "ready";
    buildingRouteStore.result = {
      status: "ok",
      originBuildingId: 31,
      destinationBuildingId: 35,
      maxSnapMeters: 250,
      walkingSpeedKph: 4.5,
      originSnap: {
        edgeIndex: 0,
        segmentIndex: 0,
        segmentFraction: 0.5,
        snappedCoordinate: [121.2435, 14.1646],
        snapMeters: 20,
        uNodeIndex: 1,
        vNodeIndex: 2,
        oneway: false,
        edgeMetersFromU: 100,
        edgeMetersToV: 100,
        geometryMetersFromU: 100,
        geometryMetersToV: 100,
        fractionAlongEdge: 0.5,
        endpointToEdgeCoordinates: [
          [121.2436644, 14.1646268],
          [121.2435, 14.1646],
        ],
      },
      destinationSnap: {
        edgeIndex: 1,
        segmentIndex: 0,
        segmentFraction: 0.5,
        snappedCoordinate: [121.2419, 14.1644],
        snapMeters: 10,
        uNodeIndex: 2,
        vNodeIndex: 3,
        oneway: false,
        edgeMetersFromU: 85,
        edgeMetersToV: 85,
        geometryMetersFromU: 85,
        geometryMetersToV: 85,
        fractionAlongEdge: 0.5,
        endpointToEdgeCoordinates: [
          [121.2418036, 14.1643788],
          [121.2419, 14.1644],
        ],
      },
      route: {
        graphMeters: 270,
        graphSeconds: 216,
        originConnectorMeters: 20,
        destinationConnectorMeters: 10,
        totalMeters: 300,
        totalSeconds: 240,
        graphCoordinates: [
          [121.2435, 14.1646],
          [121.2419, 14.1644],
        ],
        originConnectorCoordinates: [
          [121.2436644, 14.1646268],
          [121.2435, 14.1646],
        ],
        destinationConnectorCoordinates: [
          [121.2419, 14.1644],
          [121.2418036, 14.1643788],
        ],
      },
    };

    render(BuildingRoutePanel);
    expect(screen.getByText("About 4 min walk")).toBeVisible();
    expect(screen.getByText("300 m")).toBeVisible();
    expect(screen.getByText(/approximate connectors/i)).toBeVisible();
  });

  test("same-building selection reports an explicit outdoor non-route state", () => {
    buildingRouteStore.open();
    buildingRouteStore.phase = "ready";
    buildingRouteStore.origin = {
      id: 31,
      buildingName: "New Math Building",
      lat: 14.1646268,
      lon: 121.2436644,
    };
    buildingRouteStore.destination = { ...buildingRouteStore.origin };
    buildingRouteStore.result = {
      status: "same-building",
      originBuildingId: 31,
      destinationBuildingId: 31,
      maxSnapMeters: 250,
      walkingSpeedKph: 4.5,
      originSnap: null,
      destinationSnap: null,
      route: null,
    };

    render(BuildingRoutePanel);
    expect(
      screen.getByText("Same building — no outdoor walking route needed."),
    ).toBeVisible();
  });
});
