import { fireEvent, render, screen, within } from "@testing-library/svelte";
import { describe, expect, test, vi } from "vitest";
import MapFilterChips from "./MapFilterChips.svelte";
import { mountAtWidth } from "@test/layout-assertions";
import { queryStore } from "@lib/store.svelte";

describe("MapFilterChips", () => {
  test("leads with the useful chips; the org chart sits behind More", () => {
    mountAtWidth(390);
    queryStore.updateQuery({ category: null, type: "query", value: "" });
    render(MapFilterChips);

    const toolbar = screen.getByRole("toolbar", { name: "Map pin filters" });
    expect(toolbar).toBeVisible();

    const names = within(toolbar)
      .getAllByRole("button")
      .map((button) => button.textContent?.trim());
    expect(names.slice(0, 3)).toEqual([
      "Class Buildings",
      "Dorms",
      "Food & stores",
    ]);
    expect(names).toContain("Events");
    expect(names).toContain("Landmarks");
    expect(names.at(-1)).toBe("More");

    expect(screen.queryByRole("button", { name: "Divisions" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Classes" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Colleges" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Student Orgs" })).toBeNull();
  });

  test("More opens Divisions and Units and offices; picking one filters", async () => {
    mountAtWidth(390);
    queryStore.updateQuery({ category: null, type: "query", value: "" });
    render(MapFilterChips);

    const more = screen.getByRole("button", { name: "More" });
    expect(more).toHaveAttribute("aria-expanded", "false");
    await fireEvent.click(more);
    const menu = screen.getByRole("menu", { name: "More categories" });
    expect(
      within(menu).getByRole("menuitem", { name: "Units and offices" }),
    ).toBeVisible();
    await fireEvent.click(
      within(menu).getByRole("menuitem", { name: "Divisions" }),
    );

    expect(screen.queryByRole("menu")).toBeNull();
    expect(queryStore.category).toBe("browse");
    expect(queryStore.queryValue).toBe("divisions");
    // The search bar names the list; its X is the one close control.
    expect(queryStore.inputValue).toBe("Divisions");
    // The More chip shows what it is filtering.
    expect(screen.getByRole("button", { name: "Divisions" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    queryStore.clearQuery();
  });

  test("a chip puts its own label in the search bar", async () => {
    mountAtWidth(390);
    queryStore.updateQuery({ category: null, type: "query", value: "" });
    render(MapFilterChips);
    await fireEvent.click(screen.getByRole("button", { name: "Events" }));
    expect(queryStore.category).toBe("events");
    expect(queryStore.inputValue).toBe("Events");
    queryStore.clearQuery();
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
    const scrollTo = vi.fn();
    scroller.scrollTo = scrollTo as unknown as typeof scroller.scrollTo;
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

    // Pages by whole chips; with no layout every chip sits at 0, so "back"
    // lands on the start of the row.
    await fireEvent.click(back);
    expect(scrollTo.mock.calls[0]?.[0]).toMatchObject({ left: 0 });
  });
});
