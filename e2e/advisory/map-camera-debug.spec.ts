import { expect, test } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";

// #964: camera debug mode. A developer tool: the Layers sheet only offers it
// with ?debug=1 (remembered in localStorage). Confirm Escape/close behavior.
test.describe("map camera debug @advisory", () => {
  test("Layers toggles the camera HUD; Escape and close work", async ({
    page,
  }) => {
    const pageErrors: Error[] = [];
    page.on("pageerror", (error) => pageErrors.push(error));

    await page.goto("/?debug=1");
    await waitForAppBoot(page);

    await page.getByRole("button", { name: "Layers", exact: true }).click();
    const layers = page.getByRole("dialog", { name: "Layers" });
    await expect(layers).toBeVisible();
    await layers.getByRole("switch", { name: "Camera details" }).click();

    // Escape closes the sheet, HUD stays.
    await page.keyboard.press("Escape");
    await expect(layers).toBeHidden();
    const hud = page.getByRole("region", { name: "Camera details" });
    await expect(hud).toBeVisible();
    await expect(hud.getByText(/^\d+\.\d{2}$/)).toBeVisible(); // zoom

    // HUD close button turns the readout off.
    await hud.getByRole("button", { name: /hide camera details/i }).click();
    await expect(hud).toBeHidden();

    expect(pageErrors).toEqual([]);
  });

  test("normal users never see camera details", async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);
    await page.getByRole("button", { name: "Layers", exact: true }).click();
    const layers = page.getByRole("dialog", { name: "Layers" });
    await expect(layers).toBeVisible();
    await expect(
      layers.getByRole("switch", { name: "Camera details" }),
    ).toHaveCount(0);
  });
});
