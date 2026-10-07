import { expect, test } from "@playwright/test";

test.describe("modal scrollbars", () => {
  test("landing modal uses one shared scroll region", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem("hideLandingModal");
    });
    await page.goto("/");

    // First run shows a light tip card; its "How it works" opens the full
    // welcome modal (also in the menu as "How Room TBA works").
    await page.getByRole("button", { name: "How it works" }).click({
      timeout: 30_000,
    });
    const dialog = page.getByRole("dialog", { name: /room tba/i });
    await expect(dialog).toBeVisible({ timeout: 30_000 });

    const scrollRegion = page.locator(".scroll-region.map-chrome-scroll");
    await expect(scrollRegion).toHaveCount(1);
    await expect(scrollRegion).toHaveCSS("overflow-y", "auto");

    // The Campus team tab moved out to the menu's Contributors entry, which
    // opens the same modal and scroll region on its own view.
    await expect(dialog.getByRole("tablist")).toHaveCount(0);
  });
});
