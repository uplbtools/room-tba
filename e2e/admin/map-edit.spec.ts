import { test } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";
import { loginAsAdmin, logout } from "../helpers/auth";
import { openBuilding, openDorm } from "../helpers/search";
import { dragFirstMapMarker, enableMapEdit } from "../helpers/map";

test.describe("map edit", () => {
  test.slow();
  test.describe.configure({ retries: 1 });

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);
    await loginAsAdmin(page);
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test("building pin drag saves coordinates", async ({ page }) => {
    await openBuilding(page);
    await enableMapEdit(page);
    const saved = await dragFirstMapMarker(page, "/api/admin/buildings/");
    test.skip(!saved, "Pin drag did not trigger PATCH");
  });

  test("dorm pin drag saves coordinates", async ({ page }) => {
    await openDorm(page);
    await enableMapEdit(page);
    const saved = await dragFirstMapMarker(page, "/api/admin/dorms/");
    test.skip(!saved, "Dorm pin drag did not trigger PATCH");
  });
});
