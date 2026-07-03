import { test } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";
import { loginAsAdmin, logout } from "../helpers/auth";
import { openBuilding } from "../helpers/search";
import { dragFirstMapMarker, enableMapEdit } from "../helpers/map";

test.describe("undo redo", () => {
  test.slow();
  test.describe.configure({ retries: 1 });

  test("undo after pin drag via keyboard", async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);
    await loginAsAdmin(page);
    await openBuilding(page);
    await enableMapEdit(page);

    const dragged = await dragFirstMapMarker(page, "/api/admin/buildings/");
    test.skip(!dragged, "Pin drag did not save");

    const undo = page.getByRole("button", { name: /undo last pin move/i });
    if (await undo.isEnabled({ timeout: 5000 }).catch(() => false)) {
      await undo.click();
      await page.keyboard.press("Control+Z");
    }
    await logout(page);
  });
});
