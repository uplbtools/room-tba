import { test, expect } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";
import { openAppSidebar } from "../helpers/map-tools";

// Advisory (non-blocking): exercises the jeepney transit surface end to end -
// sidebar "Jeepney routes" -> browse panel -> per-route details -> modal.
test.describe("jeepney route details @advisory", () => {
  test("opens the transit browse panel and a route details modal", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForAppBoot(page);

    const sidebar = await openAppSidebar(page);
    await sidebar.getByRole("button", { name: /^jeepney routes$/i }).click();

    await expect(
      page.getByRole("heading", { name: /Jeepney Routes/i }),
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

    // Fare + direction note render.
    await expect(modal.getByText("₱13")).toBeVisible();
    await expect(modal.getByText(/same loop/i)).toBeVisible();
  });
});
