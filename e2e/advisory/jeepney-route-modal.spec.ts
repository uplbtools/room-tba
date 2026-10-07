import { test, expect } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";
import { openCampusDirectory } from "../helpers/map-tools";

// Advisory (non-blocking): exercises the jeepney transit surface end to end.
test.describe("jeepney route details @advisory", () => {
  test("opens the transit browse panel and a route details modal", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForAppBoot(page);

    await openCampusDirectory(page, "jeepney");

    await expect(
      page.getByRole("heading", { name: /Jeepney (& Bus )?Routes/i }),
    ).toBeVisible({ timeout: 10_000 });

    // Each route row exposes a details button that opens the fare/stops modal.
    await page
      .getByRole("button", { name: /route details/i })
      .first()
      .click();

    const modal = page.getByRole("dialog", { name: /jeepney route/i });
    await expect(modal).toBeVisible();
    await expect(
      modal.getByRole("heading", { name: /jeepney route/i }),
    ).toBeVisible();
    await expect(
      modal.getByRole("button", { name: /view on map/i }),
    ).toBeVisible();

    // Fare + the Kaliwa / Kanan direction toggle render.
    await expect(modal.getByText("₱14")).toBeVisible();
    await expect(
      modal.getByRole("button", { name: "Kaliwa", exact: true }),
    ).toBeVisible();
  });
});
