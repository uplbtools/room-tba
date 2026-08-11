import { fireEvent, render, screen } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { mapStore, mapViewStore } from "@lib/store.svelte";
import { mountAtWidth } from "@test/layout-assertions";
import WaybackImageryControl from "./WaybackImageryControl.svelte";

vi.mock("@lib/wayback-imagery", () => ({
  loadWaybackSnapshots: vi.fn().mockResolvedValue([
    {
      releaseNum: 123,
      releaseDate: "2018-03-14",
      acquisitionDate: "2017-12-02",
      tileUrl: "https://wayback.example/{z}/{y}/{x}",
    },
  ]),
}));

describe("WaybackImageryControl", () => {
  beforeEach(() => {
    mapStore.mapInstance = {
      getCenter: () => ({ lat: 14.165, lng: 121.242 }),
      getZoom: () => 16,
    } as never;
    mapViewStore.satellite = true;
    mapViewStore.waybackSnapshot = null;
  });

  afterEach(() => {
    mapStore.mapInstance = undefined;
    mapViewStore.satellite = false;
    mapViewStore.waybackSnapshot = null;
  });

  test("offers locally changed years and applies the chosen release", async () => {
    mountAtWidth(320);
    render(WaybackImageryControl);
    const select = await screen.findByRole("combobox", {
      name: "Historical imagery year",
    });
    expect(screen.getByRole("option", { name: "2018-03-14" })).toBeTruthy();

    await fireEvent.change(select, { target: { value: "123" } });
    expect(mapViewStore.waybackSnapshot?.releaseNum).toBe(123);
    expect(screen.getByText(/captured 2017-12-02/)).toBeTruthy();
  });
});
