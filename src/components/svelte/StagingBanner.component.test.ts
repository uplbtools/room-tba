import { render, screen } from "@testing-library/svelte";
import { describe, expect, test, vi } from "vitest";
import { mountAtWidth } from "@test/layout-assertions";

vi.mock("@lib/app-env", () => ({
  isStagingApp: vi.fn(() => false),
}));

import { isStagingApp } from "@lib/app-env";
import StagingBanner from "@ui/StagingBanner.svelte";

const mockedIsStaging = vi.mocked(isStagingApp);

describe("StagingBanner", () => {
  test("hidden when not staging", () => {
    mockedIsStaging.mockReturnValue(false);
    const { container } = render(StagingBanner);
    expect(screen.queryByRole("status")).toBeNull();
    expect(container.querySelector(".staging-banner")).toBeNull();
  });

  test("shows banner copy when staging", () => {
    mockedIsStaging.mockReturnValue(true);
    mountAtWidth(320);
    render(StagingBanner);
    expect(
      screen.getByText(/Staging — changes here are not on production/i),
    ).toBeVisible();
    expect(
      screen.getByText(/stay in the staging database until released to prod/i),
    ).toBeVisible();
  });
});
