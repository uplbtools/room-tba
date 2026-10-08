import { expect, test } from "@playwright/test";
import { suppressLandingModal, waitForAppBoot } from "../helpers/app";

/**
 * Nothing drawn on the map outlives its panel without a way to remove it: a
 * transient overlay either clears when its panel goes, or shows in the
 * active-overlays chip bar with an X.
 */
test.describe("map overlays", () => {
  test("a jeepney route clears (or offers an X) when another list opens", async ({
    page,
  }) => {
    await suppressLandingModal(page);
    await page.goto("/transit/e2e-route");
    await waitForAppBoot(page);

    const stopPins = page.locator(".jeepney-stop-pin");
    await expect(stopPins.first()).toBeAttached({ timeout: 30_000 });

    await page
      .getByRole("button", { name: "Class Buildings", exact: true })
      .first()
      .click();

    const chip = page.locator(".active-overlays__chip");
    await expect
      .poll(
        async () => (await stopPins.count()) === 0 || (await chip.count()) > 0,
        {
          timeout: 10_000,
        },
      )
      .toBe(true);
    if ((await chip.count()) > 0) {
      await chip
        .getByRole("button", { name: /^Remove / })
        .first()
        .click();
    }
    await expect(stopPins).toHaveCount(0);
    await expect(chip).toHaveCount(0);
  });

  test("a Layers filter left on shows a chip, and its X turns it off", async ({
    page,
  }) => {
    await suppressLandingModal(page);
    await page.goto("/");
    await waitForAppBoot(page);

    await page.getByRole("button", { name: "Layers", exact: true }).click();
    // Layers > Pins: All / Events only.
    await page
      .getByRole("dialog", { name: /^layers$/i })
      .getByRole("radio", { name: "Events only" })
      .click();
    await page.getByRole("button", { name: "Close layers" }).click();

    const bar = page.getByRole("toolbar", { name: "On the map" });
    await expect(bar.getByText("Events only")).toBeVisible();
    await bar.getByRole("button", { name: "Remove Events only" }).click();
    await expect(bar).toHaveCount(0);
  });
});
