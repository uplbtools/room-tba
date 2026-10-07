import { fireEvent, render, screen } from "@testing-library/svelte";
import { afterEach, describe, expect, test, vi } from "vitest";
import { locationStore, mapStore } from "@lib/store.svelte";
import MapControlsStack from "./MapControlsStack.svelte";

function controller(bearing = -45) {
  return {
    bearing,
    resetNorth: vi.fn(),
    zoomBy: vi.fn(),
    recenter: vi.fn(),
    exitTo2D: vi.fn(),
  };
}

describe("MapControlsStack driven by a controller (3D building viewer)", () => {
  test("offers compass, recenter, exit-to-2D and zoom; no location or satellite", () => {
    render(MapControlsStack, { props: { controller: controller() } });

    expect(
      screen.getByRole("button", { name: "Reset map north" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Recenter building" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Exit 3D view to the 2D map" }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Zoom in" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "My location" })).toBeNull();
    expect(screen.queryByRole("button", { name: /satellite/i })).toBeNull();
  });

  test("routes every button to the controller", async () => {
    const ctl = controller();
    render(MapControlsStack, { props: { controller: ctl } });

    await fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    await fireEvent.click(screen.getByRole("button", { name: "Zoom out" }));
    await fireEvent.click(
      screen.getByRole("button", { name: "Reset map north" }),
    );
    await fireEvent.click(
      screen.getByRole("button", { name: "Recenter building" }),
    );
    await fireEvent.click(
      screen.getByRole("button", { name: "Exit 3D view to the 2D map" }),
    );

    expect(ctl.zoomBy).toHaveBeenNthCalledWith(1, 1);
    expect(ctl.zoomBy).toHaveBeenNthCalledWith(2, -1);
    expect(ctl.resetNorth).toHaveBeenCalledOnce();
    expect(ctl.recenter).toHaveBeenCalledOnce();
    expect(ctl.exitTo2D).toHaveBeenCalledOnce();
  });

  test("compass counter-rotates with the controller's bearing", () => {
    const { container } = render(MapControlsStack, {
      props: { controller: controller(-45) },
    });
    const img = container.querySelector<HTMLImageElement>(
      ".map-ctrl__compass-img",
    );
    expect(img?.getAttribute("style")).toContain("rotate(45deg)");
  });
});

function fakeMap() {
  const handlers = new Map<string, (event: unknown) => void>();
  return {
    handlers,
    instance: {
      getBearing: () => 0,
      getPitch: () => 0,
      getZoom: () => 16,
      flyTo: vi.fn(),
      easeTo: vi.fn(),
      on: (event: string, handler: (event: unknown) => void) =>
        handlers.set(event, handler),
      off: vi.fn(),
    },
  };
}

describe("MapControlsStack locate button", () => {
  afterEach(() => {
    mapStore.mapInstance = undefined;
    locationStore.coords = null;
    locationStore.deviceHeading = null;
    locationStore.followMode = "off";
    vi.restoreAllMocks();
  });

  test("without a fix it asks for location and follows the first fix", async () => {
    const request = vi
      .spyOn(locationStore, "requestLocation")
      .mockImplementation(() => {});
    render(MapControlsStack, { props: { hideCompass: true } });

    await fireEvent.click(screen.getByRole("button", { name: "My location" }));
    expect(request).toHaveBeenCalledOnce();
    expect(locationStore.followMode).toBe("follow");
  });

  test("cycles locate, follow with heading, then north-up follow", async () => {
    const map = fakeMap();
    mapStore.mapInstance = map.instance as never;
    locationStore.coords = [121.24, 14.16];
    locationStore.deviceHeading = 90;
    render(MapControlsStack, { props: { hideCompass: true } });

    const button = screen.getByRole("button", { name: "My location" });
    expect(button.getAttribute("aria-pressed")).toBe("false");

    await fireEvent.click(button);
    expect(locationStore.followMode).toBe("follow");
    expect(map.instance.flyTo).toHaveBeenCalledWith(
      expect.objectContaining({ center: [121.24, 14.16], zoom: 17 }),
    );
    expect(button.getAttribute("aria-pressed")).toBe("true");
    expect(button.getAttribute("aria-label")).toBe(
      "Following your location. Follow your heading",
    );

    await fireEvent.click(button);
    expect(locationStore.followMode).toBe("heading");
    expect(map.instance.easeTo).toHaveBeenLastCalledWith(
      expect.objectContaining({ bearing: 90 }),
    );

    await fireEvent.click(button);
    expect(locationStore.followMode).toBe("follow");
  });

  test("dragging the map by hand stops following", async () => {
    const map = fakeMap();
    mapStore.mapInstance = map.instance as never;
    locationStore.coords = [121.24, 14.16];
    locationStore.followMode = "follow";
    render(MapControlsStack, { props: { hideCompass: true } });

    // The app's own camera moves carry no originalEvent and keep following.
    map.handlers.get("dragstart")?.({});
    expect(locationStore.followMode).toBe("follow");
    map.handlers.get("dragstart")?.({ originalEvent: new Event("mousedown") });
    expect(locationStore.followMode).toBe("off");
  });

  test("touch screens get no zoom buttons", () => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      ...original(query),
      matches: query.includes("pointer: coarse"),
    })) as typeof window.matchMedia;
    try {
      render(MapControlsStack, { props: { hideCompass: true } });
      expect(screen.queryByRole("button", { name: "Zoom in" })).toBeNull();
    } finally {
      window.matchMedia = original;
    }
  });
});
