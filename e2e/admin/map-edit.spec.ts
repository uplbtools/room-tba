import { expect, test } from "@playwright/test";
import { E2E_FIXTURES } from "../../scripts/e2e-reset-db";
import { waitForAppBoot } from "../helpers/app";
import { loginAsAdmin, logout } from "../helpers/auth";
import {
  enableMapEdit,
  expectPinDragSave,
  waitForEntityPin,
} from "../helpers/map";
import { openBuilding, openDorm } from "../helpers/search";

test.describe("map edit", () => {
  test.slow();
  test.describe.configure({ retries: 1 });
  let pageErrors: string[];

  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));
    await page.goto("/");
    await waitForAppBoot(page);
    await loginAsAdmin(page);
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
    expect(pageErrors).toEqual([]);
  });

  test("building pin drag saves coordinates", async ({ page }) => {
    await openBuilding(page);
    await waitForEntityPin(page, E2E_FIXTURES.buildingName);
    await enableMapEdit(page, "building");
    await expectPinDragSave(
      page,
      E2E_FIXTURES.buildingName,
      "/api/admin/buildings/",
    );
  });

  test("dorm pin drag saves coordinates", async ({ page }) => {
    await openDorm(page);
    await waitForEntityPin(page, E2E_FIXTURES.dormName);
    await enableMapEdit(page, "dorm");
    await expectPinDragSave(page, E2E_FIXTURES.dormName, "/api/admin/dorms/");
  });
});
