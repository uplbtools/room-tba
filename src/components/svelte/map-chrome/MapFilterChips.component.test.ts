import { render, screen } from "@testing-library/svelte";
import { describe, expect, test } from "vitest";
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
});
