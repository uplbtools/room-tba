import { expect, test } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";

// #964: camera debug mode. Right-click on the map now drops a pin (Google
// Maps), so the live camera HUD is toggled from the Layers sheet's View
// section; confirm Escape/close behavior.
test.describe("map camera debug @advisory", () => {
  test("Layers toggles the camera HUD; Escape and close work", async ({
    page,
  }) => {
    const pageErrors: Error[] = [];
    page.on("pageerror", (error) => pageErrors.push(error));

    await page.goto("/");
    await waitForAppBoot(page);

    await page.getByRole("button", { name: "Layers", exact: true }).click();
    const layers = page.getByRole("dialog", { name: "Layers" });
    await expect(layers).toBeVisible();
    const view = layers.getByRole("button", { name: "View", exact: true });
    if ((await view.getAttribute("aria-expanded")) !== "true") {
      await view.click();
    }
    await layers
      .getByRole("button", { name: /show a live camera readout/i })
      .click();

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
});
