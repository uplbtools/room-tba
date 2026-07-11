import { test, expect } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";

test.describe("staging browse", () => {
  test("map shell boots with search chrome", async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);
    await expect(
      page.getByRole("searchbox", { name: /search campus/i }),
    ).toBeVisible();
    await expect(page.locator(".term-filter-chip")).toBeVisible();
  });
});

test.describe("staging data fidelity", () => {
  test.skip("known building search — enable when staging seeded", async () => {
    // @skip until staging has AMIS/building data
  });
});
