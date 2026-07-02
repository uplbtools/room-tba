import { test, expect } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";

test.describe("keyboard nav @advisory", () => {
  test("Escape closes map tools flyout", async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);
    await page.getByRole("button", { name: /map tools/i }).click();
    const dialog = page.getByRole("dialog", { name: /map tools/i });
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible({ timeout: 5000 });
  });
});
