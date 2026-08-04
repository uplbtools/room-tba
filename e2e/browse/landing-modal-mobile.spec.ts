import { expect, test } from "@playwright/test";

/** Phone-sized welcome modal: header reads as a title bar, CTA needs no scroll. */
test.describe("landing modal on a phone", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("keeps the header small and Get Started in view", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem("hideLandingModal");
    });
    await page.goto("/");

    const dialog = page.getByRole("dialog", { name: /room tba/i });
    await expect(dialog).toBeVisible({ timeout: 30_000 });

    const cta = page.getByRole("button", { name: "Get Started" });
    await expect(cta).toBeInViewport({ ratio: 1 });

    const modalHeight = await dialog.evaluate((el) => el.clientHeight);
    const headerHeight = await page
      .locator(".landing-header")
      .evaluate((el) => el.clientHeight);
    expect(headerHeight / modalHeight).toBeLessThan(0.3);

    // Four cards on phones; the rest are desktop-only (see LandingGuideSteps).
    await expect(page.locator(".feature-card:visible")).toHaveCount(4);
  });
});
