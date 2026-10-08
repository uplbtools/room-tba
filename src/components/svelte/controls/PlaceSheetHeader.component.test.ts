import { render, screen, within } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { describe, expect, test, vi } from "vitest";
import PlaceSheetHeader from "@ui/controls/PlaceSheetHeader.svelte";
import { queryStore } from "@lib/store.svelte";

const actions = createRawSnippet(() => ({
  render: () =>
    `<span><button type="button">Directions</button><button type="button">Save</button></span>`,
}));

function renderHeader(props: Record<string, unknown> = {}) {
  return render(PlaceSheetHeader, {
    props: {
      title: "CHE Building",
      closeLabel: "Close building details",
      children: actions,
      ...props,
    },
  });
}

describe("PlaceSheetHeader", () => {
  test("name, one close button, then the actions", () => {
    renderHeader();

    expect(
      screen.getByRole("heading", { level: 2, name: "CHE Building" }),
    ).toBeTruthy();
    expect(
      screen.getAllByRole("button", { name: /^Close building details$/ }),
    ).toHaveLength(1);
    const header = screen.getByRole("banner");
    expect(
      within(header).getByRole("button", { name: "Directions" }),
    ).toBeTruthy();
  });

  test("the category is plain text, not a chip", () => {
    const { container } = renderHeader({ label: "Class building" });

    const label = screen.getByText("Class building");
    expect(label.tagName).toBe("SPAN");
    // Nothing interactive and no pill class: it must not read as a button.
    expect(label.closest("button, a")).toBeNull();
    expect(container.querySelector(".entity-header__badge")).toBeNull();
    expect(label.className).toContain("place-sheet-header__label");
  });

  test("facts sit on the one line under the name", () => {
    renderHeader({ label: "Class building", facts: "42 rooms, 3 classes now" });

    const facts = screen.getByText("42 rooms, 3 classes now");
    expect(facts.parentElement?.className).toContain(
      "place-sheet-header__meta",
    );
    expect(
      facts.parentElement?.contains(screen.getByText("Class building")),
    ).toBe(true);
  });

  test("renders no meta line when there is nothing to say", () => {
    const { container } = renderHeader();
    expect(container.querySelector(".place-sheet-header__meta")).toBeNull();
  });

  test("the X closes the open place like the search bar's X did", async () => {
    const clearQuery = vi.spyOn(queryStore, "clearQuery");
    renderHeader();

    screen.getByRole("button", { name: "Close building details" }).click();
    expect(clearQuery).toHaveBeenCalled();
    clearQuery.mockRestore();
  });
});
