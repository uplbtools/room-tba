import { test, expect } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";
import { searchAndSelect } from "../helpers/search";

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

  test("verified dorm exposes its Kubo listing without leaving Room TBA", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForAppBoot(page);
    await searchAndSelect(
      page,
      "Arable Premier Residences",
      /Arable Premier Residences/i,
    );

    await expect(
      page.getByRole("link", {
        name: "Open Arable Premier Residences on Kubo (opens in new tab)",
      }),
    ).toHaveAttribute(
      "href",
      "https://kubo.community/dorms/arable-premier-residences",
    );
  });

  test("dorm without a verified Kubo listing omits the Kubo CTA", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForAppBoot(page);
    await searchAndSelect(
      page,
      "Westbrook Residences",
      /Westbrook Residences/i,
    );

    await expect(
      page.getByRole("link", { name: /on Kubo \(opens in new tab\)/i }),
    ).toHaveCount(0);
  });
});

test.describe("staging data fidelity", () => {
  test.skip("known building search — enable when staging seeded", async () => {
    // @skip until staging has AMIS/building data
  });
});
