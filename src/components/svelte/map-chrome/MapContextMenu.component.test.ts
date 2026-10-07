import { fireEvent, render, screen } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  directionsStore,
  mapStore,
  mapViewStore,
  queryStore,
  sidePanelStore,
} from "@lib/store.svelte";
import { droppedPinStore } from "@lib/dropped-pin.svelte";
import DroppedPinPanel from "@ui/controls/DroppedPinPanel.svelte";
import MapContextMenu from "./MapContextMenu.svelte";

type ContextHandler = (event: {
  lngLat: { lat: number; lng: number };
  originalEvent: {
    clientX: number;
    clientY: number;
    target?: EventTarget | null;
    preventDefault: () => void;
  };
}) => void;

function fakeMap() {
  let contextHandler: ContextHandler | undefined;
  const off = vi.fn();
  return {
    fire: (
      lat: number,
      lng: number,
      x = 200,
      y = 150,
      target: EventTarget | null = null,
    ) =>
      contextHandler?.({
        lngLat: { lat, lng },
        originalEvent: {
          clientX: x,
          clientY: y,
          target,
          preventDefault: vi.fn(),
        },
      }),
    off,
    instance: {
      on: (event: string, handler: ContextHandler) => {
        if (event === "contextmenu") contextHandler = handler;
      },
      off,
    } as never,
  };
}

describe("MapContextMenu drops a pin on empty map", () => {
  afterEach(() => {
    mapStore.mapInstance = undefined;
    sidePanelStore.closePanel();
    droppedPinStore.clear();
    queryStore.clearQuery();
  });

  test("right-click drops a pin and opens the Dropped pin sheet", async () => {
    const map = fakeMap();
    mapStore.mapInstance = map.instance;
    queryStore.updateQuery({
      category: "building",
      type: "result",
      value: "Physical Sciences Building",
    });
    render(MapContextMenu);

    map.fire(14.16512, 121.24138);
    expect(droppedPinStore.at).toEqual({ lat: 14.16512, lng: 121.24138 });
    expect(sidePanelStore.state).toMatchObject({
      type: "search-result",
      component: DroppedPinPanel,
    });
    // The pin replaces the open place, search bar included.
    expect(queryStore.category).toBeNull();
    expect(screen.queryByRole("dialog", { name: "Map options" })).toBeNull();
  });

  test("a press on a marker is not empty map", () => {
    const map = fakeMap();
    mapStore.mapInstance = map.instance;
    render(MapContextMenu);
    const marker = document.createElement("div");
    marker.className = "maplibregl-marker";
    const glyph = document.createElement("span");
    marker.append(glyph);

    map.fire(14.165, 121.243, 200, 150, glyph);
    expect(droppedPinStore.at).toBeNull();
    expect(sidePanelStore.state).toBeNull();
  });
});

describe("MapContextMenu while planning directions", () => {
  beforeEach(() => {
    localStorage.removeItem("camera-debug");
    mapViewStore.cameraDebug = false;
    directionsStore.openFrom({ lat: 14.16, lng: 121.24, label: "Start" });
  });

  afterEach(() => {
    mapStore.mapInstance = undefined;
    mapViewStore.cameraDebug = false;
    localStorage.removeItem("camera-debug");
    directionsStore.close();
  });

  test("right-click opens the dialog with the clicked coordinates", async () => {
    const map = fakeMap();
    mapStore.mapInstance = map.instance;
    render(MapContextMenu);

    expect(screen.queryByRole("dialog", { name: "Map options" })).toBeNull();
    map.fire(14.16512, 121.24138);
    expect(
      await screen.findByRole("dialog", { name: "Map options" }),
    ).toBeInTheDocument();
    expect(screen.getByText("14.16512, 121.24138")).toBeInTheDocument();
  });

  test("checkbox reflects and toggles the camera debug flag", async () => {
    const map = fakeMap();
    mapStore.mapInstance = map.instance;
    render(MapContextMenu);
    map.fire(14.165, 121.243);

    const checkbox = await screen.findByRole("checkbox", {
      name: /show camera details/i,
    });
    expect((checkbox as HTMLInputElement).checked).toBe(false);
    await fireEvent.click(checkbox);
    expect(mapViewStore.cameraDebug).toBe(true);
  });

  test("Escape closes the menu; unmount unsubscribes", async () => {
    const map = fakeMap();
    mapStore.mapInstance = map.instance;
    const { unmount } = render(MapContextMenu);
    map.fire(14.165, 121.243);

    const dialog = await screen.findByRole("dialog", { name: "Map options" });
    await fireEvent.keyDown(dialog, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Map options" })).toBeNull();

    unmount();
    expect(map.off).toHaveBeenCalledWith("contextmenu", expect.any(Function));
  });

  test("outside pointerdown closes the menu", async () => {
    const map = fakeMap();
    mapStore.mapInstance = map.instance;
    render(MapContextMenu);
    map.fire(14.165, 121.243);
    await screen.findByRole("dialog", { name: "Map options" });

    await fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("dialog", { name: "Map options" })).toBeNull();
  });

  test("offers directions and a printable jeep map from the clicked point", async () => {
    const map = fakeMap();
    mapStore.mapInstance = map.instance;
    render(MapContextMenu);
    map.fire(14.16512, 121.24138);

    const link = await screen.findByRole("link", {
      name: /printable jeep map from here/i,
    });
    expect(link.getAttribute("href")).toBe(
      "/api/transit-map?lat=14.16512&lon=121.24138",
    );

    await fireEvent.click(
      screen.getByRole("button", { name: /directions from here/i }),
    );
    expect(screen.queryByRole("dialog", { name: "Map options" })).toBeNull();
    expect(directionsStore.active).toBe(true);
    expect(directionsStore.originFixed).toBe(true);
    expect(directionsStore.origin).toMatchObject({
      lat: 14.16512,
      lng: 121.24138,
      label: "Dropped pin",
    });
  });
});
