import { render, screen, within } from "@testing-library/svelte";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { mapToolsStore, mapViewStore } from "@lib/store.svelte";
import MapToolsFlyout from "./MapToolsFlyout.svelte";

// The legend reads campus data from the app root's context.
vi.mock("@lib/context", () => ({
  getAppData: () => () => ({ events: null, loaded: false }),
}));

vi.mock("@lib/debug-flag", () => ({ debugMode: true }));

describe("MapToolsFlyout with the developer flag", () => {
  beforeEach(() => {
    localStorage.clear();
    mapToolsStore.close();
    mapViewStore.cameraDebug = false;
  });

  test("camera details switch appears under Developer", async () => {
    mapToolsStore.toggle();
    render(MapToolsFlyout);
    const sheet = await screen.findByRole("dialog", { name: "Layers" });
    const camera = within(sheet).getByRole("switch", {
      name: "Camera details",
    });
    camera.click();
    expect(mapViewStore.cameraDebug).toBe(true);
  });
});
