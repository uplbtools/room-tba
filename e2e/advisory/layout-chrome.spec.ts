import { test, expect } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";

test.describe("layout chrome @advisory", () => {
  test("login modal fits viewport", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto("/?editor=login");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    const box = await dialog.boundingBox();
    expect(box?.width ?? 400).toBeLessThanOrEqual(320);
  });

  test("map tools tappable on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await waitForAppBoot(page);
    await page.getByRole("button", { name: /map tools/i }).click();
    await expect(
      page.getByRole("dialog", { name: /map tools/i }),
    ).toBeVisible();
  });
});
