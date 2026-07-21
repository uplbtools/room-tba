import { render, screen } from "@testing-library/svelte";
import { describe, expect, test } from "vitest";
import EntityEmptyStateHost from "@test/components/EntityEmptyStateHost.svelte";
import {
  expectNoHorizontalOverflow,
  mountAtWidth,
} from "@test/layout-assertions";

describe("EntityEmptyState", () => {
  test("renders title and body without overflowing at 320px", () => {
    mountAtWidth(320);
    const { container } = render(EntityEmptyStateHost);

    expect(
      screen.getByRole("heading", { name: "Empty floors for now" }),
    ).toBeVisible();
    expect(screen.getByText("No rooms found for this building.")).toBeVisible();
    expect(screen.getByRole("status")).toBeVisible();
    expect(
      container.querySelector(
        ".entity-empty-state__art svg[aria-hidden='true']",
      ),
    ).toBeTruthy();
    expectNoHorizontalOverflow(container);
  });
});
