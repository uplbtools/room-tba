import { expect, test } from "@playwright/test";
import { suppressLandingModal, waitForAppBoot } from "../helpers/app";

/** Jakob audit macros 13 (dark mode) and 14 (phone landscape). */
test.describe("appearance and landscape", () => {
  test("follows system dark before first paint and keeps a Settings override", async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await suppressLandingModal(page);
    await page.goto("/");
    // Set by the inline head script, before the app hydrates.
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await waitForAppBoot(page);

    await page.evaluate(() => localStorage.setItem("room-tba:theme", "light"));
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });

  test("phone landscape keeps every map control on screen above a slim nav", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 750, height: 342 });
    await suppressLandingModal(page);
    await page.goto("/");
    await waitForAppBoot(page);

    const nav = page.getByRole("navigation", { name: "Primary" });
    const navBox = await nav.boundingBox();
    expect(navBox?.height ?? 999).toBeLessThanOrEqual(48);

    const chips = await page.locator(".map-filter-chips").boundingBox();
    for (const name of [/map tools/i, /location/i, "Zoom in", "Zoom out"]) {
      const control = page.getByRole("button", { name }).first();
      await expect(control).toBeVisible();
      const box = await control.boundingBox();
      expect(box).not.toBeNull();
      if (!box || !navBox) continue;
      // Clear of the nav below and the browse chips above.
      expect(box.y + box.height).toBeLessThanOrEqual(navBox.y);
      if (chips) expect(box.y).toBeGreaterThanOrEqual(chips.y + chips.height);
    }
  });
});
