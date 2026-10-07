import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, test } from "vitest";
import SavedPlacesModal from "@ui/modal/SavedPlacesModal.svelte";
import { recentPlaces, savedPlaces } from "@lib/saved-places.svelte";
import { modalStore, queryStore } from "@lib/store.svelte";

describe("SavedPlacesModal", () => {
  beforeEach(() => {
    localStorage.clear();
    savedPlaces.load();
    recentPlaces.load();
    queryStore.clearQuery();
  });

  test("empty state explains how to save", () => {
    render(SavedPlacesModal);
    expect(screen.getByText(/to keep it here/)).toBeInTheDocument();
    expect(screen.getByText("Places you open show up here.")).toBeVisible();
  });

  test("lists saved and recent places and opens one", async () => {
    savedPlaces.save({
      category: "building",
      value: "Physical Sciences Building",
      label: "Physical Sciences Building",
      subtitle: "Class building",
    });
    recentPlaces.record({ category: "room", value: "PS 105", label: "PS 105" });
    modalStore.openModal("saved-places");
    render(SavedPlacesModal);

    expect(screen.getByText("Class building")).toBeVisible();
    await fireEvent.click(screen.getByRole("button", { name: /PS 105/ }));

    expect(queryStore.category).toBe("room");
    expect(queryStore.queryValue).toBe("PS 105");
    expect(modalStore.open).toBe(false);
  });

  test("remove and clear update the lists", async () => {
    savedPlaces.save({
      category: "place",
      value: "Oblation",
      label: "Oblation",
    });
    recentPlaces.record({
      category: "place",
      value: "Oblation",
      label: "Oblation",
    });
    render(SavedPlacesModal);

    await fireEvent.click(
      screen.getByRole("button", { name: "Remove Oblation from Saved" }),
    );
    expect(savedPlaces.items).toEqual([]);

    await fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(recentPlaces.items).toEqual([]);
    expect(screen.queryByRole("button", { name: /Oblation/ })).toBeNull();
  });
});
