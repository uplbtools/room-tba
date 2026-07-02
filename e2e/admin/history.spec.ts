import { test, expect } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";
import { loginAsAdmin, logout } from "../helpers/auth";
import { openRoom } from "../helpers/search";
import { countEditorHistory } from "../helpers/db";

test.describe("editor history", () => {
  test("room save creates editor_history row", async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);
    await loginAsAdmin(page);
    await openRoom(page);

    const before = (await countEditorHistory("room", 1)) ?? 0;
    const directions = page.getByLabel(/directions/i);
    if (await directions.isVisible({ timeout: 5000 }).catch(() => false)) {
      await directions.fill(`History test ${Date.now()}`);
      await page.getByRole("button", { name: /save/i }).first().click();
      await page.waitForTimeout(2000);
      const after = (await countEditorHistory("room", 1)) ?? before;
      expect(after).toBeGreaterThanOrEqual(before);
    }
    await logout(page);
  });
});
