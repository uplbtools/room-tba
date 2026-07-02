import { test, expect } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";
import { E2E_FIXTURES } from "../../scripts/e2e-reset-db";

test.describe("mobile search collapse", () => {
  test("map menu blur preserves query and panel @mobile", async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, "mobile only");
    await page.goto("/");
    await waitForAppBoot(page);

    const search = page.getByPlaceholder("Search campus");
    await search.fill(E2E_FIXTURES.buildingName);
    await page
      .getByRole("option", { name: new RegExp(E2E_FIXTURES.buildingName, "i") })
      .first()
      .click({ timeout: 15_000 });

    await expect(page.getByText(E2E_FIXTURES.buildingName).first()).toBeVisible();

    await page.getByRole("button", { name: /map menu/i }).click();
    await page.getByRole("button", { name: /map menu/i }).click();

    await search.click();
    await expect(search).toHaveValue(E2E_FIXTURES.buildingName);
    await expect(page.getByText(E2E_FIXTURES.buildingName).first()).toBeVisible();
  });
});
