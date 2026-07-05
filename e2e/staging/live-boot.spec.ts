import { test, expect } from "@playwright/test";
import { campusSearchBox, waitForAppBoot } from "../helpers/app";

test.describe("staging live boot", () => {
  test("homepage loads", async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);
    await expect(campusSearchBox(page)).toBeVisible();
  });

  test("/admin redirects", async ({ page, request }) => {
    const res = await request.get("/admin", { maxRedirects: 0 });
    expect(res.status()).toBeGreaterThanOrEqual(300);
    expect(res.status()).toBeLessThan(400);
    expect(res.headers().location ?? "").toMatch(/editor=login/);

    await page.goto("/admin");
    await expect(page).toHaveURL(/editor=login/);
  });
});
