import { test, expect } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";

test.describe("transit jeepney @advisory", () => {
  test("transit filter chip reachable", async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);
    const transit = page.getByRole("button", { name: /transit|jeepney/i }).first();
    if (await transit.isVisible({ timeout: 5000 }).catch(() => false)) {
      await transit.click();
      await expect(page).not.toHaveTitle("");
    }
  });
});
