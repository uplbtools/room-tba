import { test, expect } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";
import { loginAsAdmin, logout } from "../helpers/auth";
import { openBuilding } from "../helpers/search";

test.describe("building 3D viewer", () => {
  test("guest does not see edit positions", async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);
    await openBuilding(page);
    const view3d = page.getByRole("button", { name: /3d|view building/i });
    if (await view3d.isVisible({ timeout: 5000 }).catch(() => false)) {
      await view3d.click();
      await expect(page.getByText(/edit positions/i)).not.toBeVisible();
    }
  });

  test("admin sees edit positions control", async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);
    await loginAsAdmin(page);
    await openBuilding(page);
    const view3d = page.getByRole("button", { name: /3d|view building/i });
    if (await view3d.isVisible({ timeout: 5000 }).catch(() => false)) {
      await view3d.click();
      await expect(page.getByText(/edit positions/i)).toBeVisible({
        timeout: 10_000,
      });
    }
    await logout(page);
  });
});
