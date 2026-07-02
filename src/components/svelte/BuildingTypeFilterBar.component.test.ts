import { render, screen } from "@testing-library/svelte";
import { describe, expect, test } from "vitest";
import BuildingTypeFilterBarHost from "@test/components/BuildingTypeFilterBarHost.svelte";
import { mountAtWidth } from "@test/layout-assertions";

describe("BuildingTypeFilterBar", () => {
  test("filter chips render without overlapping at 320px", () => {
    mountAtWidth(320);
    render(BuildingTypeFilterBarHost);
    const toolbar = screen.getByRole("toolbar", {
      name: "Building pin filters",
    });
    expect(toolbar).toBeVisible();
    expect(screen.getByRole("button", { name: /All,/i })).toBeVisible();
    expect(toolbar.scrollWidth).toBeLessThanOrEqual(320 + 8);
  });
});
