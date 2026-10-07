import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, test, vi } from "vitest";
import MapFilterChips from "./MapFilterChips.svelte";
import { mountAtWidth } from "@test/layout-assertions";
import { queryStore } from "@lib/store.svelte";

describe("MapFilterChips", () => {
  test("matches the map chrome chip row (no Classes / Colleges / Orgs dupes)", () => {
    mountAtWidth(390);
    queryStore.updateQuery({ category: null, type: "query", value: "" });
    render(MapFilterChips);

    const toolbar = screen.getByRole("toolbar", { name: "Map pin filters" });
    expect(toolbar).toBeVisible();

    expect(
      screen.getByRole("button", { name: "Class Buildings" }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Dorms" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Divisions" })).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Units and offices" }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Landmark" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Stores" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Events" })).toBeVisible();

    expect(screen.queryByRole("button", { name: "Classes" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Colleges" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Student Orgs" })).toBeNull();
  });

  test("offers a way back once the chips are scrolled, with faded edges", async () => {
    mountAtWidth(390);
    queryStore.updateQuery({ category: null, type: "query", value: "" });
    const { container } = render(MapFilterChips);
    const scroller = container.querySelector(
      ".map-filter-chips__scroll",
    ) as HTMLDivElement;
    // jsdom has no layout: fake an overflowing row scrolled to the middle.
    Object.defineProperty(scroller, "scrollWidth", { value: 900 });
    Object.defineProperty(scroller, "clientWidth", { value: 300 });
    scroller.scrollLeft = 200;
    const scrollBy = vi.fn();
    scroller.scrollBy = scrollBy as unknown as typeof scroller.scrollBy;
    await fireEvent.scroll(scroller);

    const back = await screen.findByRole("button", {
      name: "Show previous filters",
    });
    expect(
      screen.getByRole("button", { name: "Show more filters" }),
    ).toBeVisible();
    expect(scroller.classList).toContain(
      "map-filter-chips__scroll--fade-start",
    );
    expect(scroller.classList).toContain("map-filter-chips__scroll--fade-end");

    await fireEvent.click(back);
    expect(scrollBy.mock.calls[0]?.[0]).toMatchObject({ left: -165 });
  });
});
