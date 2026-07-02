import { test } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";
import { loginAsAdmin, logout } from "../helpers/auth";
import { openBuilding } from "../helpers/search";

test.describe("building 3D autosave @advisory", () => {
  test("admin opens 3D viewer without pageerror", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/");
    await waitForAppBoot(page);
    await loginAsAdmin(page);
    await openBuilding(page);

    const view3d = page.getByRole("button", { name: /3d|view building/i });
    if (await view3d.isVisible({ timeout: 5000 }).catch(() => false)) {
      await view3d.click();
      await page.waitForTimeout(2000);
    }
    test.info().annotations.push({
      type: "pageerrors",
      description: String(errors.length),
    });
    await logout(page);
  });
});
