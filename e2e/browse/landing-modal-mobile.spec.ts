import { expect, test } from "@playwright/test";

/** Phone-sized guide: a standard top app bar, Done in view, one scroll. */
test.describe("landing modal on a phone", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("keeps the bar small and Done in view", async ({ page }) => {
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

    const done = dialog.getByRole("button", { name: "Done", exact: true });
    await expect(done).toBeInViewport({ ratio: 1 });

    const modalHeight = await dialog.evaluate((el) => el.clientHeight);
    const headerHeight = await dialog
      .locator(".modal-header")
      .evaluate((el) => el.clientHeight);
    expect(headerHeight / modalHeight).toBeLessThan(0.3);

    // Every feature is an actionable row, the same on phone and desktop.
    await expect(
      dialog.getByRole("button", { name: "Search rooms and buildings" }),
    ).toBeVisible();
  });
});
