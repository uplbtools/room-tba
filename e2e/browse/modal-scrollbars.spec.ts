import { expect, test } from "@playwright/test";

test.describe("modal scrollbars", () => {
  test("landing modal uses one shared scroll region", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem("hideLandingModal");
    });
    await page.goto("/");

    const dialog = page.getByRole("dialog", { name: /room tba/i });
    await expect(dialog).toBeVisible({ timeout: 30_000 });

    const scrollRegion = page.locator(".scroll-region.map-chrome-scroll");
    await expect(scrollRegion).toHaveCount(1);
    await expect(scrollRegion).toHaveCSS("overflow-y", "auto");

    await page.getByRole("tab", { name: "Campus team" }).click();
    await expect(scrollRegion).toHaveCount(1);
  });
});
