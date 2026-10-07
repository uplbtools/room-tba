import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, test, vi } from "vitest";
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
