import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, test } from "vitest";
import EntitySaveButton from "@ui/controls/EntitySaveButton.svelte";
import { recentPlaces, savedPlaces } from "@lib/saved-places.svelte";

const place = {
  category: "dorm",
  value: "Makiling Residence Hall",
  label: "Makiling Residence Hall",
  subtitle: "UP-managed dorm",
  lat: 14.16,
  lon: 121.24,
} as const;

describe("EntitySaveButton", () => {
  beforeEach(() => {
    localStorage.clear();
    savedPlaces.load();
    recentPlaces.load();
  });

  test("toggles Save / Saved with aria-pressed", async () => {
    render(EntitySaveButton, { props: { place } });
    const btn = screen.getByRole("button", {
      name: "Save Makiling Residence Hall",
    });
    expect(btn).toHaveAttribute("aria-pressed", "false");
    expect(btn).toHaveTextContent("Save");

    await fireEvent.click(btn);
    expect(btn).toHaveAttribute("aria-pressed", "true");
    expect(btn).toHaveTextContent("Saved");
    expect(savedPlaces.has("dorm", place.value)).toBe(true);

    await fireEvent.click(btn);
    expect(btn).toHaveAttribute("aria-pressed", "false");
    expect(savedPlaces.has("dorm", place.value)).toBe(false);
  });

  test("opening a sheet records it as recently viewed", () => {
    render(EntitySaveButton, { props: { place } });
    expect(recentPlaces.items.map((p) => p.value)).toEqual([place.value]);
  });
});
