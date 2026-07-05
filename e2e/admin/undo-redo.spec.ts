import { expect, test } from "@playwright/test";
import { E2E_FIXTURES } from "../../scripts/e2e-reset-db";
import { waitForAppBoot } from "../helpers/app";
import { loginAsAdmin, logout } from "../helpers/auth";
import {
  enableMapEdit,
  expectPinDragSave,
  waitForEntityPin,
} from "../helpers/map";
import { openBuilding } from "../helpers/search";

test.describe("undo redo", () => {
  test.slow();
  test.describe.configure({ retries: 1 });

  test("undo and redo after pin drag", async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);
    await loginAsAdmin(page);
    await openBuilding(page);
    await waitForEntityPin(page, E2E_FIXTURES.buildingName);
    await enableMapEdit(page, "building");

    await expectPinDragSave(
      page,
      E2E_FIXTURES.buildingName,
      "/api/admin/buildings/",
    );

    const undo = page.getByRole("button", { name: /undo last pin move/i });
    const redo = page.getByRole("button", { name: /redo last pin move/i });
    await expect(undo).toBeEnabled({ timeout: 10_000 });
    await undo.click();
    await expect(redo).toBeEnabled({ timeout: 10_000 });
    await redo.click();
    await logout(page);
  });
});
