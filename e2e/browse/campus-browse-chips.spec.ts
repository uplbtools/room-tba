import { test, expect } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";

test.describe("campus browse chips", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);
  });

  test("Buildings opens browse panel with building list", async ({ page }) => {
    await page.getByRole("button", { name: "Browse buildings" }).click();
    await expect(page.getByRole("heading", { name: /Buildings/i })).toBeVisible({
      timeout: 10_000,
    });
  });

  test("Colleges opens browse panel on colleges tab", async ({ page }) => {
    await page.getByRole("button", { name: "Browse colleges" }).click();
    await expect(page.getByRole("heading", { name: /Colleges/i })).toBeVisible({
      timeout: 10_000,
    });
  });

  test("Divisions opens browse panel on divisions tab", async ({ page }) => {
    await page.getByRole("button", { name: "Browse divisions" }).click();
    await expect(page.getByRole("heading", { name: /Divisions/i })).toBeVisible({
      timeout: 10_000,
    });
  });

  test("Classes opens class list without toggling building filter chip", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Browse all classes" }).click();
    await expect(page.getByText(/All classes/i).first()).toBeVisible({
      timeout: 10_000,
    });
    const allFilter = page.getByRole("button", { name: /^All,/i });
    await expect(allFilter).toHaveAttribute("aria-pressed", "false");
    await expect(
      page.getByRole("button", { name: "Browse all classes" }),
    ).toHaveAttribute("aria-pressed", "true");
  });
});
