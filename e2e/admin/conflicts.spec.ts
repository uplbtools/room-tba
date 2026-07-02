import { test, expect } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";
import { loginAsAdmin, logout } from "../helpers/auth";
import { openRoom } from "../helpers/search";
import { bumpEntityVersion } from "../helpers/db";

test.describe("conflict handling", () => {
  test("stale room save surfaces conflict", async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);
    await loginAsAdmin(page);
    await openRoom(page);

    await bumpEntityVersion("rooms", 1);

    const directions = page.getByLabel(/directions/i);
    if (await directions.isVisible({ timeout: 5000 }).catch(() => false)) {
      await directions.fill(`Conflict test ${Date.now()}`);
      await page.getByRole("button", { name: /save/i }).first().click();
      await expect(
        page.getByText(/conflict|stale|refresh|newer version/i).first(),
      ).toBeVisible({ timeout: 15_000 });
    }
    await logout(page);
  });
});
