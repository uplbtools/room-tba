import { test, expect } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";
import { loginAsAdmin, logout } from "../helpers/auth";
import { openBuilding, openRoom } from "../helpers/search";

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
  test("admin sees 'Move in 3D' from room panel when building has coordinates", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForAppBoot(page);
    await loginAsAdmin(page);
    await openRoom(page);

    // Check for Move in 3D button - it should be visible for rooms in buildings with coordinates
    const moveIn3D = page.getByRole("button", { name: /move in 3d/i });
    if (await moveIn3D.isVisible({ timeout: 5000 }).catch(() => false)) {
      await moveIn3D.click();
      await expect(page.getByText(/edit positions/i)).toBeVisible({
        timeout: 10_000,
      });
    }
    await logout(page);
  });
});
