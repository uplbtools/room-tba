import { test, expect } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";
import { openMapTools, expandMapToolsSection } from "../helpers/map-tools";

// Advisory (non-blocking): exercises the jeepney transit surface end to end -
// Map tools → Transit route list → per-route "route details" → JeepneyRouteModal.
// Kept advisory because it depends on the heavy E2E preview + DB; promote to a
// blocking smoke spec once the app-menu jeepney entry has a stable seam.
test.describe("jeepney route details @advisory", () => {
  test("opens the transit route list and a route details modal", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForAppBoot(page);

    await openMapTools(page);
    await expandMapToolsSection(page, "Transit");

    // The route list is a listbox of route options.
    const routes = page.getByRole("listbox", { name: /jeepney routes/i });
    await expect(routes).toBeVisible();
    await expect(routes.getByRole("option").first()).toBeVisible();

    // Each route exposes a details button that opens the fare/stops modal.
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
  });
});
