import { test, expect } from "@playwright/test";
import { campusSearchBox, waitForAppBoot } from "../helpers/app";
import { openBuilding } from "../helpers/search";
import { E2E_FIXTURES } from "../../scripts/e2e-reset-db";

test.describe("mobile search collapse", () => {
  test("map menu blur preserves query and panel @mobile", async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, "mobile only");
    await page.goto("/");
    await waitForAppBoot(page);

    await openBuilding(page);

    await expect(
      page.getByText(E2E_FIXTURES.buildingName).first(),
    ).toBeVisible();

    await page.getByRole("button", { name: /map menu/i }).click();
    await page.getByRole("button", { name: /map menu/i }).click();

    const search = campusSearchBox(page);
    await search.click();
    await expect(search).toHaveValue(E2E_FIXTURES.buildingName);
    await expect(
      page.getByText(E2E_FIXTURES.buildingName).first(),
    ).toBeVisible();
  });
});
