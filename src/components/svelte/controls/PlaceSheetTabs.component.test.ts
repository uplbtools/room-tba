import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, test, vi } from "vitest";
import PlaceSheetTabs from "@ui/controls/PlaceSheetTabs.svelte";

describe("PlaceSheetTabs", () => {
  test("marks the active tab and reports selection", async () => {
    const onselect = vi.fn();
    render(PlaceSheetTabs, {
      props: {
        tabs: [
          { id: "overview", label: "Overview" },
          { id: "rooms", label: "Rooms" },
          { id: "photos", label: "Photos" },
        ],
        active: "overview",
        onselect,
      },
    });
    expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await fireEvent.click(screen.getByRole("tab", { name: "Rooms" }));
    expect(onselect).toHaveBeenCalledWith("rooms");
  });
});
