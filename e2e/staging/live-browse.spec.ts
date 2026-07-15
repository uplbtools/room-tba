import { test, expect } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";

test.describe("staging browse", () => {
  test("map shell boots with search chrome", async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);
    await expect(
      page.getByRole("searchbox", { name: /search campus/i }),
    ).toBeVisible();
    // Term chip lives in entity/class panels now, not the base map chrome, so
    // it is not asserted on plain boot. See data-fidelity.spec.ts for the
    // active-semester data check.
  });
});

test.describe("staging data fidelity", () => {
  test.skip("known building search — enable when staging seeded", async () => {
    // @skip until staging has AMIS/building data
  });
});
