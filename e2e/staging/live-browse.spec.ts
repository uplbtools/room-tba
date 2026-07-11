import { test, expect } from "@playwright/test";
import { dismissLandingIfPresent, waitForAppBoot } from "../helpers/app";
import { openMapTools } from "../helpers/map-tools";

test.describe("staging browse", () => {
  test("map tools flyout opens", async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);
    await dismissLandingIfPresent(page);
    await openMapTools(page);
    await expect(page.getByRole("dialog", { name: /map tools/i })).toBeVisible({
      timeout: 15_000,
    });
  });
});

test.describe("staging data fidelity", () => {
  test.skip("known building search — enable when staging seeded", async () => {
    // @skip until staging has AMIS/building data
  });
});
